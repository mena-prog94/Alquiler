import { Component, OnInit, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
  IonMenuButton, IonBackButton, IonItem, IonLabel, IonInput,
  IonSelect, IonSelectOption, IonTextarea, IonButton, IonIcon,
  ToastController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, cloudUploadOutline, keyOutline, saveOutline } from 'ionicons/icons';

// Importación correcta de AngularFire Firestore
import { Firestore, collection, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../../service/auth';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-vivienda',
  templateUrl: './vivienda.page.html',
  styleUrls: ['./vivienda.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
    IonBackButton, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonTextarea, IonButton, IonIcon,
    CommonModule, ReactiveFormsModule
  ]
})
export class ViviendaPage implements OnInit {
  viviendaForm!: FormGroup;
  cargando = false;
  modoEdicion = false;
  viviendaId: string | null = null;

  // Inyección moderna de Firestore mediante AngularFire
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private toastController = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  public router = inject(Router);
  private route = inject(ActivatedRoute);

  constructor() {
    addIcons({ homeOutline, cloudUploadOutline, keyOutline, saveOutline });
  }

  async ngOnInit() {
    this.viviendaForm = new FormGroup({
      codigo: new FormControl('', [Validators.required]),
      tipo: new FormControl('', [Validators.required]),
      direccion: new FormControl('', [Validators.required]),
      precioMensual: new FormControl('', [Validators.required, Validators.min(1)]),
      estado: new FormControl('Disponible', [Validators.required]),
      habitaciones: new FormControl('', [Validators.required, Validators.min(0)]),
      banos: new FormControl('', [Validators.required, Validators.min(0)])
    });

    this.viviendaId = this.route.snapshot.paramMap.get('id');
    if (this.viviendaId) {
      this.modoEdicion = true;
      await this.cargarDatosParaEditar(this.viviendaId);
    }
  }

  /**
   * Guarda o actualiza la vivienda de forma segura
   */
  async guardarVivienda(): Promise<string | null> {
    if (this.viviendaForm.invalid) {
      this.mostrarMensaje('Por favor completa todos los campos requeridos.', 'warning');
      return null;
    }

    this.cargando = true;
    try {
      if (this.modoEdicion && this.viviendaId) {
        // Uso de la instancia inyectada para actualizar
        const docRef = doc(this.firestore, 'viviendas', this.viviendaId);
        await updateDoc(docRef, this.viviendaForm.value);
        this.mostrarMensaje('Propiedad actualizada correctamente.', 'success');
        return this.viviendaId;
      } else {
        const usuarioAuth = await firstValueFrom(this.authService.user$);
        // Uso de la instancia inyectada para agregar un nuevo documento
        const colRef = collection(this.firestore, 'viviendas');
        const nuevoDoc = await addDoc(colRef, {
          ...this.viviendaForm.value,
          registradoPor: usuarioAuth?.uid,
          fechaRegistro: new Date()
        });
        this.mostrarMensaje('Propiedad guardada con éxito.', 'success');
        this.viviendaId = nuevoDoc.id;
        this.modoEdicion = true;
        return nuevoDoc.id;
      }
    } catch (error) {
      console.error(error);
      this.mostrarMensaje('Error al procesar el guardado.', 'danger');
      return null;
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Maneja el evento estándar de guardar desde el formulario (ngSubmit)
   */
  async gestionarGuardado() {
    const id = await this.guardarVivienda();
    if (id) {
      this.router.navigate(['/viviendas']); 
    }
  }

  /**
   * Guarda la vivienda (o usa la existente si ya fue creada) y redirige a clientes para rentar
   */
  async rentarViviendaDirectamente() {
    if (this.viviendaForm.invalid) {
      this.mostrarMensaje('Completa los datos de la vivienda antes de rentar.', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Procesando...', cssClass: 'custom-loading' });
    await loading.present();

    let idVivienda = this.viviendaId;
    if (!idVivienda) {
      idVivienda = await this.guardarVivienda();
    }

    await loading.dismiss();

    if (idVivienda) {
      this.router.navigate(['/clientes'], { 
        queryParams: { viviendaPorRentar: idVivienda } 
      });
    }
  }

  async cargarDatosParaEditar(id: string) {
    const loading = await this.loadingCtrl.create({ message: 'Cargando propiedad...', cssClass: 'custom-loading' });
    await loading.present();
    try {
      // Uso de la instancia inyectada para obtener el documento
      const docRef = doc(this.firestore, 'viviendas', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        this.viviendaForm.patchValue(docSnap.data());
      }
    } catch (error) {
      this.mostrarMensaje('Error al obtener los datos.', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje, duration: 3000, color: color, position: 'bottom'
    });
    await toast.present();
  }
}