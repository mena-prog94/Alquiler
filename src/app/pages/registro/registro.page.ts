import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
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

  async ejecutarRegistro() {
    try {
      const credenciales = await this.authService.registrarUsuario(this.correo, this.contrasenia);
      this.mostrarMensaje(`¡Usuario creado con éxito! Bienvenido: ${credenciales.user.email}`);
     this.router.navigate(['/login']); 
    } catch (error: any) {
      this.mostrarMensaje(`Error al registrarse: ${error.message}`);
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