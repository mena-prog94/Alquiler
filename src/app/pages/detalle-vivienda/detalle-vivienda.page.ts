import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, 
  IonItem, IonIcon, IonLabel, IonButton, IonSpinner, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  homeOutline, locationOutline, cashOutline, bedOutline, waterOutline, 
  keyOutline, refreshOutline, createOutline, alertCircleOutline 
} from 'ionicons/icons';

// Importación correcta de AngularFire Firestore
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-detalle-vivienda',
  templateUrl: './detalle-vivienda.page.html',
  styleUrls: ['./detalle-vivienda.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonBackButton, IonCard, IonCardHeader, IonCardSubtitle, 
    IonCardTitle, IonCardContent, IonItem, IonIcon, IonLabel, IonButton, IonSpinner
  ]
})
export class DetalleViviendaPage implements OnInit {
  viviendaId: string | null = null;
  vivienda: any = null;
  cargando = true;

  // Inyección moderna de Firestore
  private firestore = inject(Firestore);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  constructor() {
    addIcons({locationOutline, cashOutline, bedOutline, waterOutline, createOutline, keyOutline, refreshOutline, alertCircleOutline, homeOutline});
  }

  async ngOnInit() {
    this.viviendaId = this.route.snapshot.paramMap.get('id');
    if (this.viviendaId) {
      await this.cargarDetalleVivienda(this.viviendaId);
    }
  }

  async cargarDetalleVivienda(id: string) {
    try {
      // Uso de la instancia inyectada para obtener el documento
      const docRef = doc(this.firestore, 'viviendas', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        this.vivienda = docSnap.data();
      } else {
        console.error('La propiedad seleccionada no existe.');
      }
    } catch (error) {
      console.error('Error al cargar la vivienda:', error);
    } finally {
      this.cargando = false;
    }
  }

  async rentarDesdeDetalle() {
    if (!this.viviendaId || !this.vivienda) return;

    const alert = await this.alertCtrl.create({
      header: 'Asignar Vivienda',
      message: `¿Deseas registrar/asignar un cliente para la vivienda ${this.vivienda.codigo}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, Asignar',
          handler: () => {
            this.router.navigate(['/clientes'], { 
              queryParams: { viviendaPorRentar: this.viviendaId } 
            });
          }
        }
      ],
      cssClass: 'custom-alert'
    });

    await alert.present();
  }

  async liberarDesdeDetalle() {
    if (!this.viviendaId || !this.vivienda) return;

    const alert = await this.alertCtrl.create({
      header: 'Confirmar Liberación',
      message: `¿Estás seguro de que deseas liberar la vivienda ${this.vivienda.codigo} y marcarla como Disponible?`,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí',
          handler: async () => {
            await this.ejecutarLiberacion();
          }
        }
      ],
      cssClass: 'custom-alert'
    });

    await alert.present();
  }

  private async ejecutarLiberacion() {
    try {
      // Uso de la instancia inyectada para actualizar el documento
      const docRef = doc(this.firestore, 'viviendas', this.viviendaId!);
      await updateDoc(docRef, { estado: 'Disponible' });
      this.vivienda.estado = 'Disponible';

      const toast = await this.toastCtrl.create({
        message: '¡La propiedad ahora está Disponible!',
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (error) {
      console.error(error);
    }
  }
}