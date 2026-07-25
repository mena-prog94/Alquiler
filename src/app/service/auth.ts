import { Injectable, inject } from '@angular/core';
import { 
  Auth, 
  authState, 
  User, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  createUserWithEmailAndPassword, 
  signOut 
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Inyección única y segura de AngularFire
  private auth: Auth = inject(Auth);
  
  // Observable que rastrea al usuario actual
  public user$: Observable<User | null> = authState(this.auth);

  constructor() {}

  /**
   * Inicia sesión con Firebase Auth
   */
  login(correo: string, clave: string) {
    return signInWithEmailAndPassword(this.auth, correo, clave);
  }

  /**
   * Envía un enlace de restablecimiento oficial de Firebase al correo
   */
  recuperarClave(correo: string) {
    return sendPasswordResetEmail(this.auth, correo);
  }
  
  /**
   * Registra un nuevo usuario con correo y contraseña
   */
  registrarUsuario(correo: string, contrasenia: string) {
    return createUserWithEmailAndPassword(this.auth, correo, contrasenia);
  }
  

  /**
   * Cierra la sesión activa
   */
  cerrarSesion() {
    return signOut(this.auth);
  }
}