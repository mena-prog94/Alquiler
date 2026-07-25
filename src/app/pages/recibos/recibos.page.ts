import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonContent, IonList, IonBadge, IonButton, IonButtons, IonIcon, 
  IonCard, IonCardContent, AlertController, IonTitle, 
  IonBackButton, IonToolbar, IonHeader, ToastController,
  IonItem, IonLabel, IonNote 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, cashOutline, alertCircleOutline, eyeOutline } from 'ionicons/icons';

// Importación correcta de AngularFire Firestore
import { Firestore, collection, doc, updateDoc, getDocs, addDoc, getDoc, onSnapshot, Unsubscribe, query, where, orderBy, limit } from '@angular/fire/firestore';

@Component({
  selector: 'app-recibos',
  templateUrl: './recibos.page.html',
  styleUrls: ['./recibos.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonContent, 
    IonList, 
    IonBadge, 
    IonButton, 
    IonButtons, 
    IonIcon, 
    IonCard, 
    IonCardContent, 
    IonTitle, 
    IonBackButton, 
    IonToolbar, 
    IonHeader
  ]
})
export class RecibosPage implements OnInit, OnDestroy {
  // Inyección moderna de Firestore
  private firestore = inject(Firestore);
  
  recibos: any[] = [];
  private unsubscribe: Unsubscribe | null = null;

  private alertController = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  constructor() {
    addIcons({ receiptOutline, cashOutline, alertCircleOutline, eyeOutline });
  }

  ngOnInit() {
    this.cargarRecibosTiempoReal();
    this.verificarVencimientosPendientes();
    this.verificarYGenerarFacturasMensualesCiclo();
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  // Cargar recibos en tiempo real usando la instancia inyectada this.firestore
  cargarRecibosTiempoReal() {
    const recibosRef = collection(this.firestore, 'facturas');
    this.unsubscribe = onSnapshot(recibosRef, (snapshot) => {
      this.recibos = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
    }, (error) => {
      console.error("Error al escuchar los recibos:", error);
    });
  }

  verDetalles(recibo: any) {
    this.router.navigate(['/detalle-recibo', recibo.id]);
  }

  async marcarComoPagado(recibo: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: `¿Registrar pago de $${recibo.monto}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Pagar',
          handler: async () => {
            try {
              const docRef = doc(this.firestore, 'facturas', recibo.id);
              await updateDoc(docRef, { estadoPago: 'pagado' });

              if (recibo.tipo === 'deposito' && recibo.clienteId) {
                await this.generarFacturaMensualTrasDeposito(recibo);
                const toast = await this.toastCtrl.create({ 
                  message: 'Depósito registrado y factura mensual generada.', 
                  duration: 3000, 
                  color: 'success' 
                });
                await toast.present();
              }

              this.router.navigate(['/detalle-recibo', recibo.id]);

            } catch (error) {
              console.error("Error al procesar pago:", error);
            }
          }
        }
      ],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  async generarFacturaMensualTrasDeposito(reciboDeposito: any) {
    const baseDate = reciboDeposito.fechaEmision.toDate 
      ? reciboDeposito.fechaEmision.toDate() 
      : new Date(reciboDeposito.fechaEmision);

    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const fechaEmisionMesSig = new Date(year, month + 1, baseDate.getDate());
    const fechaVence = new Date(fechaEmisionMesSig.getTime() + (30 * 24 * 60 * 60 * 1000));

    let montoMensual = 0;
    const vivSnap = await getDoc(doc(this.firestore, 'viviendas', reciboDeposito.viviendaId));
    if (vivSnap.exists()) {
      montoMensual = vivSnap.data()['precioMensual'] || 0;
    }

    await addDoc(collection(this.firestore, 'facturas'), {
      clienteId: reciboDeposito.clienteId,
      viviendaId: reciboDeposito.viviendaId,
      nombreCliente: reciboDeposito.nombreCliente,
      vivienda: reciboDeposito.vivienda,
      monto: montoMensual,
      tipo: 'mensual',
      estadoPago: 'pendiente',
      fechaEmision: fechaEmisionMesSig,
      fechaVence: fechaVence,
      numeroFactura: 'FAC-' + Math.floor(Math.random() * 100000),
      nota: 'Factura mensual generada automáticamente.'
    });
  }

  // Verificación automática cada 30 días para facturas mensuales recurrentes
  async verificarYGenerarFacturasMensualesCiclo() {
    try {
      const facturasRef = collection(this.firestore, 'facturas');
      const querySnapshot = await getDocs(facturasRef);
      const hoy = new Date();

      // Agrupar por viviendaId para encontrar la factura más reciente de tipo 'mensual' de cada alquiler
      const ultimasFacturasPorVivienda = new Map<string, any>();

      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data['tipo'] === 'mensual' && data['viviendaId']) {
          const viviendaId = data['viviendaId'];
          const fechaEmision = data['fechaEmision'].toDate ? data['fechaEmision'].toDate() : new Date(data['fechaEmision']);
          
          if (!ultimasFacturasPorVivienda.has(viviendaId) || fechaEmision > ultimasFacturasPorVivienda.get(viviendaId).fechaEmisionDate) {
            ultimasFacturasPorVivienda.set(viviendaId, {
              ...data,
              fechaEmisionDate: fechaEmision
            });
          }
        }
      });

      // Evaluar si la última factura ya cumplió 30 días o más
      for (const [viviendaId, ultimaFactura] of ultimasFacturasPorVivienda.entries()) {
        const diferenciaDias = Math.floor((hoy.getTime() - ultimaFactura.fechaEmisionDate.getTime()) / (1000 * 60 * 60 * 24));

        // Si ya pasaron 30 días o más desde la emisión de la última factura mensual
        if (diferenciaDias >= 30) {
          // Validar si ya existe una factura posterior con fecha de emisión mayor para evitar duplicados
          const nuevaFechaEmision = new Date(ultimaFactura.fechaEmisionDate.getTime() + (30 * 24 * 60 * 60 * 1000));
          const fechaVence = new Date(nuevaFechaEmision.getTime() + (30 * 24 * 60 * 60 * 1000));

          let montoMensual = ultimaFactura.monto || 0;
          const vivSnap = await getDoc(doc(this.firestore, 'viviendas', viviendaId));
          if (vivSnap.exists()) {
            montoMensual = vivSnap.data()['precioMensual'] || montoMensual;
          }

          await addDoc(collection(this.firestore, 'facturas'), {
            clienteId: ultimaFactura.clienteId,
            viviendaId: viviendaId,
            nombreCliente: ultimaFactura.nombreCliente,
            vivienda: ultimaFactura.vivienda,
            monto: montoMensual,
            tipo: 'mensual',
            estadoPago: 'pendiente',
            fechaEmision: nuevaFechaEmision,
            fechaVence: fechaVence,
            numeroFactura: 'FAC-' + Math.floor(Math.random() * 100000),
            nota: 'Factura mensual generada automáticamente por ciclo de 30 días.'
          });
        }
      }
    } catch (error) {
      console.error("Error al verificar ciclos de facturación mensual:", error);
    }
  }

  getEstadoVencimiento(recibo: any) {
    if (recibo.estadoPago === 'pagado') return { texto: 'Pagado', color: 'success' };
    if (!recibo.fechaVence) return { texto: 'Sin fecha', color: 'medium' };
    const fechaV = recibo.fechaVence.toDate ? recibo.fechaVence.toDate() : new Date(recibo.fechaVence);
    const diffDays = Math.ceil((fechaV.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { texto: 'Vencido', color: 'danger' };
    if (diffDays <= 7) return { texto: 'Próximo a vencer', color: 'warning' };
    return { texto: 'Al día', color: 'medium' };
  }

  async verificarVencimientosPendientes() {
    const snap = await getDocs(collection(this.firestore, 'facturas'));
    let count = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data['estadoPago'] !== 'pagado' && data['fechaVence']) {
        const f = data['fechaVence'].toDate ? data['fechaVence'].toDate() : new Date(data['fechaVence']);
        if ((f.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 7) count++;
      }
    });
    if (count > 0) {
      const toast = await this.toastCtrl.create({ 
        message: `¡Atención! ${count} recibo(s) por vencer.`, 
        duration: 5000, 
        color: 'warning', 
        position: 'top' 
      });
      await toast.present();
    }
  }
}