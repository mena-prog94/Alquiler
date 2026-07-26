import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../service/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule] // Asegúrate de importar FormsModule para usar [(ngModel)]
})
export class RegisterPage {
  correo: string = '';
  contrasenia: string = '';

  // Inyectar dependencias utilizando la sintaxis moderna de Angular
  private authService = inject(AuthService);
  private toastController = inject(ToastController);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController); // Inyectado para mostrar el cargando

  async ejecutarRegistro() {
    if (!this.correo || !this.contrasenia) {
      this.mostrarMensaje('Por favor, completa todos los campos.');
      return;
    }

    // Crear y presentar el indicador de carga
    const loading = await this.loadingCtrl.create({
      message: 'Registrando usuario...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();

    try {
      const credenciales = await this.authService.registrarUsuario(this.correo.trim(), this.contrasenia.trim());
      await loading.dismiss(); // Ocultar carga al tener éxito

      this.mostrarMensaje(`¡Usuario creado con éxito! Bienvenido: ${credenciales.user.email}`);
      this.router.navigate(['/login']); 
    } catch (error: any) {
      await loading.dismiss(); // Ocultar carga si ocurre un error
      console.error('Error en Registro Firebase:', error);

      // Manejo amigable de errores comunes de Firebase en el registro
      let mensajeError = `Error al registrarse: ${error.message}`;
      if (error.code === 'auth/email-already-in-use') {
        mensajeError = 'El correo electrónico ya está registrado.';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'El formato del correo electrónico no es válido.';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña debe tener al menos 6 caracteres.';
      }

      this.mostrarMensaje(mensajeError);
    }
  }

  async mostrarMensaje(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      position: 'bottom'
    });
    await toast.present();
  }
}