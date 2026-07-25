import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { 
  NavController, LoadingController, 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonCardContent, IonIcon, IonCard, AlertController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, homeOutline, personOutline, logOutOutline, receiptOutline } from 'ionicons/icons';
import { AuthService } from '../../service/auth';

// 1. Importaciones correctas de AngularFire Auth
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

// 2. Importaciones correctas de AngularFire Firestore
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonMenuButton, IonCardContent, IonIcon, IonCard
  ]
})
export class DashboardPage implements OnInit {
  private alertController = inject(AlertController);
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private loadingCtrl = inject(LoadingController);

  // 3. Inyección segura de Firestore y Auth mediante AngularFire
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  userName: string = 'nombrecompleto';
  totalPropiedades = 0;
  totalInquilinos = 0;
  totalCobrado = 0;

  constructor() {
    addIcons({peopleOutline, homeOutline, receiptOutline, personOutline, logOutOutline});
  }

  async ngOnInit() {
    await this.cargarEstadisticas();
    this.obtenerUsuario();
  }

  obtenerUsuario() {
    // Escuchar el estado de autenticación usando la instancia inyectada de Auth
    onAuthStateChanged(this.auth, (u) => {
      if (u) {
        this.userName = u.displayName || u.email?.split('@')[0] || 'Administrador';
      }
    });
  }

  async cargarEstadisticas() {
    try {
      const hoy = new Date();
      const mesActual = hoy.getMonth();
      
      // Usando this.firestore en lugar de la función global getFirestore()
      const viviendasSnap = await getDocs(collection(this.firestore, 'viviendas'));
      this.totalPropiedades = viviendasSnap.size;

      const qInquilinos = query(collection(this.firestore, 'viviendas'), where('estado', '==', 'Rentada'));
      const inquilinosSnap = await getDocs(qInquilinos);
      this.totalInquilinos = inquilinosSnap.size;

      const qPagos = query(collection(this.firestore, 'facturas'), where('estadoPago', '==', 'pagado'));
      const pagosSnap = await getDocs(qPagos);

      this.totalCobrado = pagosSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        return data['mes'] === mesActual ? sum + (data['monto'] || 0) : sum;
      }, 0);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  }

 async cerrarSesion() {
  const alert = await this.alertController.create({
    header: 'Cerrar Sesión',
    message: '¿Estás seguro de que deseas salir de la aplicación?',
    buttons: [
      {
        text: 'No',
        role: 'cancel',
        cssClass: 'secondary'
      },
      {
        text: 'Sí',
        handler: async () => {
          try {
            await this.authService.cerrarSesion();
            this.navCtrl.navigateRoot('/login');
          } catch (error) {
            console.error("Error al cerrar sesión:", error);
          }
        }
      }
    ],
    cssClass: 'custom-alert'
  });

  await alert.present();
}
}