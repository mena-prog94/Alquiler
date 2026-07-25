import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonMenuButton, IonTitle, IonAvatar, IonList, 
  IonItem, IonIcon, IonLabel, IonButton, AlertController, ModalController 
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { mailOutline, businessOutline, cameraOutline, createOutline, arrowBackOutline, trashOutline } from 'ionicons/icons';

// Importación correcta de AngularFire Auth
import { Auth, updateProfile, onAuthStateChanged } from '@angular/fire/auth';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';

@Component({
  selector: 'app-foto-modal',
  standalone: true,
  template: `
    <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:black;">
      <img [src]="foto" style="width:100%; max-height:80vh; object-fit:contain;">
      <div style="display:flex; gap: 10px; margin-top:20px;">
        <ion-button fill="clear" color="light" (click)="cerrar()">Cerrar</ion-button>
        <ion-button fill="clear" color="danger" (click)="eliminarDesdeModal()">Eliminar foto</ion-button>
      </div>
    </div>
  `,
  imports: [IonButton]
})
class FotoModalComponent {
  foto!: string;
  private modalCtrl = inject(ModalController);
  
  constructor() {
    addIcons({cameraOutline, mailOutline, trashOutline});
  }
  cerrar() { this.modalCtrl.dismiss(); }
  eliminarDesdeModal() { this.modalCtrl.dismiss('eliminar'); }
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar, IonButtons, 
    IonMenuButton, IonTitle, IonAvatar, IonList, IonItem, 
    IonIcon, IonLabel, IonButton, IonBackButton
  ]
})
export class PerfilPage implements OnInit {
  private auth = inject(Auth);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController); 
  private cdr = inject(ChangeDetectorRef);
  
  nombreUsuario = '';
  emailUsuario = '';
  fotoPerfil = localStorage.getItem('fotoPerfil') || ''; 
  posicionFoto = localStorage.getItem('posicionFoto') || 'center';

  constructor() {
    addIcons({ mailOutline, businessOutline, cameraOutline, createOutline, arrowBackOutline, trashOutline });
  }

  ngOnInit() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      this.nombreUsuario = currentUser.displayName || localStorage.getItem('nombreUsuario') || 'Administrador';
      this.emailUsuario = currentUser.email || '';
      if (currentUser.photoURL) {
        this.fotoPerfil = currentUser.photoURL;
      }
    }

    onAuthStateChanged(this.auth, (u) => {
      if (u) {
        this.nombreUsuario = u.displayName || localStorage.getItem('nombreUsuario') || 'Administrador';
        this.emailUsuario = u.email || '';
        
        if (u.photoURL) {
          this.fotoPerfil = u.photoURL;
          localStorage.setItem('fotoPerfil', u.photoURL);
        } else {
          this.fotoPerfil = '';
          localStorage.removeItem('fotoPerfil');
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  ajustarEnfoque(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    if (y < height / 3) this.posicionFoto = 'top';
    else if (y > (height / 3) * 2) this.posicionFoto = 'bottom';
    else this.posicionFoto = 'center';

    localStorage.setItem('posicionFoto', this.posicionFoto);
  }

  async verFotoGrande() {
    const modal = await this.modalCtrl.create({
      component: FotoModalComponent,
      componentProps: { foto: this.fotoPerfil || 'assets/avatar-usuario.jpg' }
    });
    
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data === 'eliminar') {
      this.ejecutarEliminacionFoto();
    }
  }

  async cambiarFoto(event: Event) {
    event.stopPropagation();
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        allowEditing: true
      });
      if (image.dataUrl) {
        this.fotoPerfil = image.dataUrl;
        localStorage.setItem('fotoPerfil', image.dataUrl); 
        const u = this.auth.currentUser;
        if (u) await updateProfile(u, { photoURL: this.fotoPerfil });
        this.cdr.detectChanges();
      }
    } catch (e) { 
      console.log('Selección cancelada'); 
    }
  }

  async eliminarFoto(event: Event) {
    event.stopPropagation();
    
    const alert = await this.alertCtrl.create({
      header: 'Eliminar foto',
      message: '¿Estás seguro de que deseas eliminar tu foto de perfil?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: () => {
            this.ejecutarEliminacionFoto();
          }
        }
      ]
    });
    await alert.present();
  }

  private async ejecutarEliminacionFoto() {
    try {
      this.fotoPerfil = '';
      localStorage.removeItem('fotoPerfil');
      localStorage.removeItem('posicionFoto');
      
      const u = this.auth.currentUser;
      if (u) {
        await updateProfile(u, { photoURL: '' });
      }
      
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error al eliminar la foto', error);
    }
  }

  async editarPerfil() {
    const alert = await this.alertCtrl.create({
      header: 'Editar Perfil',
      inputs: [
        { name: 'nombre', type: 'text', placeholder: 'Nombre', value: this.nombreUsuario },
        { name: 'email', type: 'email', placeholder: 'Correo', value: this.emailUsuario }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Guardar', 
          handler: async (data) => {
            const u = this.auth.currentUser;
            if (u) {
              await updateProfile(u, { displayName: data.nombre });
              this.nombreUsuario = data.nombre;
              this.emailUsuario = data.email;
              localStorage.setItem('nombreUsuario', data.nombre);
              this.cdr.detectChanges();
            }
          }
        }
      ],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }
}