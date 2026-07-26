import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { IonicModule, ToastController, AlertController, LoadingController } from '@ionic/angular'; 
import { AuthService } from '../../service/auth'; // Ajusta la ruta exacta a tu servicio
import { addIcons,  } from 'ionicons';
import { mailOutline, lockClosedOutline, personCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true, 
  imports: [
    CommonModule, 
    FormsModule,    
    IonicModule,    
    RouterModule
  ]
})
export class LoginPage {
  email = '';
  password = '';

  // Usando el método inyectado moderno de Angular
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private authService = inject(AuthService);
  private loadingCtrl = inject(LoadingController); // Inyectado para mostrar el indicador de carga

  constructor() {
    addIcons({ 
      'mail-outline': mailOutline,
      'lock-closed-outline': lockClosedOutline,
      'person-circle-outline': personCircleOutline 
    });
  }

  async onLogin() {
    if (!this.email || !this.password) {
      this.presentToast('Por favor, completa todos los campos.', 'warning');
      return;
    }

    // Crear y presentar el indicador de carga
    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();

    try {
      // Intentar iniciar sesión con Firebase Auth
      await this.authService.login(this.email.trim(), this.password.trim());
      await loading.dismiss(); // Ocultar carga al tener éxito
      
      this.presentToast('¡Bienvenido de nuevo!', 'success');
      this.router.navigate(['/dashboard']); // Redirección al Home
    } catch (error: any) {
      await loading.dismiss(); // Ocultar carga si ocurre un error
      console.error('Error en Login Firebase:', error);
      
      // Manejo amigable de errores comunes de Firebase
      let mensajeError = 'Credenciales incorrectas o error de conexión.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        mensajeError = 'El correo o la contraseña son incorrectos.';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'El formato del correo electrónico no es válido.';
      }
      
      this.presentToast(mensajeError, 'danger');
    }
  }

  async recuperarContrasena() {
    const alert = await this.alertCtrl.create({
      header: 'Recuperar Contraseña',
      subHeader: 'Introduce tu correo electrónico registrado para restablecer tu acceso.',
      inputs: [
        {
          name: 'correoRecuperacion',
          type: 'email',
          placeholder: 'ejemplo@correo.com',
          value: this.email ? this.email.trim() : ''
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Enviar',
          handler: (data) => {
            const correoInput = data.correoRecuperacion?.trim();

            if (!correoInput) {
              this.presentToast('Debes ingresar un correo electrónico válido.', 'warning');
              return false; 
            }

            this.ejecutarSolicitudRecuperacion(correoInput);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async ejecutarSolicitudRecuperacion(correo: string) {
    try {
      // Firebase envía automáticamente un correo oficial y seguro para cambiar de clave
      await this.authService.recuperarClave(correo);
      
      const exitoAlert = await this.alertCtrl.create({
        header: 'Enlace Enviado',
        subHeader: 'Revisa tu bandeja de entrada',
        message: `Hemos enviado un correo a <b>${correo}</b> con las instrucciones para restablecer tu contraseña con total seguridad.`,
        buttons: ['Entendido']
      });
      await exitoAlert.present();
    } catch (error: any) {
      console.error('Error de recuperación Firebase:', error);
      let mensajeError = 'No se pudo procesar la solicitud en este momento.';
      if (error.code === 'auth/invalid-email') {
        mensajeError = 'El correo electrónico no tiene un formato válido.';
      } else if (error.code === 'auth/user-not-found') {
        mensajeError = 'El correo ingresado no se encuentra registrado.';
      }
      this.presentToast(mensajeError, 'danger');
    }
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}