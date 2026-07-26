import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
  IonBackButton, IonItem, IonLabel, IonInput, IonSelect,
  IonSelectOption, IonButton, IonIcon, ToastController, AlertController, LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, saveOutline, imageOutline, documentTextOutline, createOutline, trashOutline } from 'ionicons/icons';

// Importación correcta de AngularFire Firestore
import { Firestore, collection, addDoc, doc, updateDoc, getDoc, onSnapshot, Unsubscribe } from '@angular/fire/firestore';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonButton, IonIcon, CommonModule, ReactiveFormsModule
  ]
})
export class ClientesPage implements OnInit, OnDestroy {
  clienteForm!: FormGroup;
  cargando = false;
  imagenContratoB64: string | null = null;
  
  viviendas: any[] = [];
  private viviendasUnsubscribe: Unsubscribe | null = null;
  
  clienteIdEnEdicion: string | null = null;
  viviendaOriginalId: string | null = null;

  // Inyección moderna de Firestore y controladores mediante AngularFire
  private firestore = inject(Firestore);
  private toastController = inject(ToastController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private loadingCtrl = inject(LoadingController); // Inyectado para el indicador de carga

  constructor() {
    addIcons({ personAddOutline, saveOutline, imageOutline, documentTextOutline, createOutline, trashOutline });
  }

  ngOnInit() {
    this.clienteForm = new FormGroup({
      nombreCompleto: new FormControl('', [Validators.required]),
      cedula: new FormControl('', [Validators.required]),
      telefono: new FormControl('', [Validators.required]),
      correo: new FormControl('', [Validators.required, Validators.email]),
      viviendaAsignada: new FormControl('', [Validators.required]),
      tipoContrato: new FormControl('meses', [Validators.required]),
      duracionContrato: new FormControl('', [Validators.required, Validators.min(1)]),
      montoDeposito: new FormControl('', [Validators.required, Validators.min(0)])
    });

    this.clienteForm.get('tipoContrato')?.valueChanges.subscribe(tipo => {
      const duracionControl = this.clienteForm.get('duracionContrato');
      if (tipo === 'libre') {
        duracionControl?.clearValidators();
      } else {
        duracionControl?.setValidators([Validators.required, Validators.min(1)]);
      }
      duracionControl?.updateValueAndValidity();
    });

    // Capturar parámetros de ruta (Modo edición o asignación directa desde detalle de vivienda)
    this.route.queryParams.subscribe(params => {
      if (params['modo'] === 'editar' && params['id']) {
        this.clienteIdEnEdicion = params['id'];
        this.cargarDatosParaEdicion(this.clienteIdEnEdicion!);
      } else if (params['viviendaPorRentar']) {
        this.clienteForm.patchValue({ viviendaAsignada: params['viviendaPorRentar'] });
      }
    });

    // Escuchar viviendas en tiempo real usando la instancia inyectada this.firestore
    const viviendasRef = collection(this.firestore, 'viviendas');
    this.viviendasUnsubscribe = onSnapshot(viviendasRef, (snapshot) => {
      this.viviendas = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }, (error) => {
      console.error("Error al escuchar viviendas:", error);
    });
  }

  async cargarDatosParaEdicion(id: string) {
    const docRef = doc(this.firestore, `clientes/${id}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      this.clienteForm.patchValue(data);
      this.viviendaOriginalId = data['viviendaAsignada'] || null; 
      this.imagenContratoB64 = data['imagenContrato'] || null;
    }
  }

  ngOnDestroy() { 
    if (this.viviendasUnsubscribe) {
      this.viviendasUnsubscribe();
    }
  }

  async guardarCliente() {
    if (this.clienteForm.invalid) return;

    // Crear y presentar el indicador de carga
    const loading = await this.loadingCtrl.create({
      message: this.clienteIdEnEdicion ? 'Actualizando cliente...' : 'Registrando cliente y factura...',
      spinner: 'crescent',
      cssClass: 'custom-loading'
    });
    await loading.present();

    this.cargando = true;

    try {
      const datosForm = this.clienteForm.getRawValue();
      const viviendaSeleccionada = this.viviendas.find(v => v.id === datosForm.viviendaAsignada);
      const codigoVivienda = viviendaSeleccionada ? viviendaSeleccionada.codigo : 'Sin código';
      const duracionFinal = datosForm.tipoContrato === 'libre' ? 'Indefinido' : datosForm.duracionContrato;

      if (!this.clienteIdEnEdicion) {
        const clienteRef = await addDoc(collection(this.firestore, 'clientes'), { 
          ...datosForm, 
          duracionContrato: duracionFinal,
          imagenContrato: this.imagenContratoB64, 
          fechaRegistro: new Date() 
        });

        // Solo se genera la factura del depósito (con cédula y teléfono incluidos)
        await addDoc(collection(this.firestore, 'facturas'), {
          clienteId: clienteRef.id,
          nombreCliente: datosForm.nombreCompleto,
          cedula: datosForm.cedula,
          telefono: datosForm.telefono,
          viviendaId: datosForm.viviendaAsignada,
          vivienda: codigoVivienda,
          monto: datosForm.montoDeposito,
          tipo: 'deposito',
          estadoPago: 'pendiente',
          fechaEmision: new Date(),
          numeroFactura: 'DEPOSITO-' + Math.floor(Math.random() * 100000),
          nota: 'Depósito de garantía inicial'
        });

        await updateDoc(doc(this.firestore, 'viviendas', datosForm.viviendaAsignada), {
          clienteId: clienteRef.id,
          estado: 'Rentada'
        });

        await loading.dismiss();
        await this.mostrarToast('Cliente registrado y factura de depósito generada', 'success');
      } else {
        const clienteRef = doc(this.firestore, `clientes/${this.clienteIdEnEdicion}`);
        await updateDoc(clienteRef, {
          ...datosForm,
          duracionContrato: duracionFinal,
          imagenContrato: this.imagenContratoB64
        });

        if (this.viviendaOriginalId && this.viviendaOriginalId !== datosForm.viviendaAsignada) {
          await updateDoc(doc(this.firestore, 'viviendas', this.viviendaOriginalId), {
            clienteId: null,
            estado: 'Disponible'
          });
          await updateDoc(doc(this.firestore, 'viviendas', datosForm.viviendaAsignada), {
            clienteId: this.clienteIdEnEdicion,
            estado: 'Rentada'
          });
        }

        await loading.dismiss();
        await this.mostrarToast('Datos del cliente actualizados', 'success');
      }

      // Limpiar formulario y variables auxiliares tras guardar con éxito
      this.clienteForm.reset({ tipoContrato: 'meses' });
      this.imagenContratoB64 = null;
      this.clienteIdEnEdicion = null;
      this.viviendaOriginalId = null;

      this.router.navigate(['/recibos']);
    } catch (error) {
      await loading.dismiss();
      console.error(error);
      await this.mostrarToast('Error al procesar el registro', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async cancelarContrato() {
    if (!this.clienteIdEnEdicion) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancelar Contrato',
      message: '¿Estás seguro de cancelar este contrato? La vivienda quedará liberada (disponible inmediatamente).',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, Cancelar Contrato',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Cancelando contrato...',
              spinner: 'crescent',
              cssClass: 'custom-loading'
            });
            await loading.present();

            this.cargando = true;
            try {
              const viviendaIdALiberar = this.viviendaOriginalId || this.clienteForm.get('viviendaAsignada')?.value;
              if (viviendaIdALiberar) {
                await updateDoc(doc(this.firestore, 'viviendas', viviendaIdALiberar), {
                  clienteId: null,
                  estado: 'Disponible'
                });
              }

              await updateDoc(doc(this.firestore, `clientes/${this.clienteIdEnEdicion}`), {
                estadoContrato: 'Cancelado',
                viviendaAsignada: null
              });

              await loading.dismiss();
              await this.mostrarToast('Contrato cancelado y vivienda liberada', 'success');
              this.router.navigate(['/recibos']);
            } catch (error) {
              await loading.dismiss();
              console.error(error);
              await this.mostrarToast('Error al cancelar el contrato', 'danger');
            } finally {
              this.cargando = false;
            }
          }
        }
      ],
      cssClass: 'custom-alert'
    });

    await alert.present();
  }

  async mostrarToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }

  async verificarEstadoVivienda(event: any) {
    const viviendaId = event.detail.value;
    const viviendaSeleccionada = this.viviendas.find(v => v.id === viviendaId);
    
    if (viviendaSeleccionada && viviendaSeleccionada.estado === 'Rentada' && viviendaId !== this.viviendaOriginalId) {
      const toast = await this.toastCtrl.create({
        message: 'Esta vivienda ya se encuentra rentada.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
      
      this.clienteForm.get('viviendaAsignada')?.setValue(null);
    }
  }
}