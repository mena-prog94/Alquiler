import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { 
  IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, 
  IonItem, IonIcon, IonLabel, IonMenuToggle, IonRouterOutlet, MenuController 
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  gridOutline, homeOutline, chevronDownOutline, chevronForwardOutline, 
  addOutline, peopleOutline, personAddOutline, businessOutline, 
  personOutline, receiptOutline, logOutOutline 
} from 'ionicons/icons';

// Importaciones correctas de AngularFire (Modular SDK compatible con dependencias)
import { Firestore, collection, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { Auth, signOut } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, 
    IonContent, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, 
    IonMenuToggle, IonRouterOutlet
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  appPages: any[] = []; 
  
  mostrarViviendasRegistradas = false;
  mostrarClientesRegistrados = false; 
  
  viviendas: any[] = [];
  clientes: any[] = [];

  private unsubViviendas: Unsubscribe | null = null;
  private unsubClientes: Unsubscribe | null = null;
  
  // Inyecciones limpias usando inject() o el constructor
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);
  private firestore = inject(Firestore); // Inyectamos Firestore de AngularFire
  private auth = inject(Auth);  
  private alertController = inject(AlertController);         // Inyectamos Auth de AngularFire

  constructor() {
    addIcons({
      gridOutline, homeOutline, addOutline, businessOutline, peopleOutline, 
      personAddOutline, personOutline, receiptOutline, logOutOutline, 
      chevronDownOutline, chevronForwardOutline
    });
  }

  ngOnInit() {
    // Escuchar viviendas en tiempo real usando la instancia inyectada de Firestore
    const viviendasRef = collection(this.firestore, 'viviendas');
    this.unsubViviendas = onSnapshot(viviendasRef, (snapshot) => {
      this.viviendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // Escuchar clientes en tiempo real
    const clientesRef = collection(this.firestore, 'clientes');
    this.unsubClientes = onSnapshot(clientesRef, (snapshot) => {
      this.clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
  }

  ngOnDestroy() {
    if (this.unsubViviendas) this.unsubViviendas();
    if (this.unsubClientes) this.unsubClientes();
  }

async realizarCierreSesion() {
    const alert = await this.alertController.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que deseas salir de la aplicación?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Sí, Salir',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            try {
              await this.menuCtrl.close(); 
              await signOut(this.auth); 
              this.router.navigate(['/login']);
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          }
        }
      ],
      cssClass: 'custom-logout-alert'
    });

    await alert.present();
  }

  toggleViviendasSubmenu() {
    this.mostrarViviendasRegistradas = !this.mostrarViviendasRegistradas;
    if (this.mostrarViviendasRegistradas) this.mostrarClientesRegistrados = false;
  }

  toggleClientesSubmenu() {
    this.mostrarClientesRegistrados = !this.mostrarClientesRegistrados;
    if (this.mostrarClientesRegistrados) this.mostrarViviendasRegistradas = false;
  }
}