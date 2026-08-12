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
import { Firestore, collection, doc, updateDoc, getDocs, addDoc, getDoc, onSnapshot, Unsubscribe } from '@angular/fire/firestore';

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

  cargarRecibosTiempoReal() {
    const recibosRef = collection(this.firestore, 'facturas');
    
    this.unsubscribe = onSnapshot(recibosRef, (snapshot) => {
      this.recibos = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          fechaEmisionDate: data['fechaEmision']?.toDate ? data['fechaEmision'].toDate() : new Date(data['fechaEmision'])
        };
      });

      // Ordenar de más reciente a más antiguo de forma segura
      this.recibos.sort((a, b) => b.fechaEmisionDate.getTime() - a.fechaEmisionDate.getTime());
      
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
    const fechaActual = new Date();
    const fechaVence = new Date(fechaActual);
    fechaVence.setDate(fechaVence.getDate() + 30);

    let montoMensual = 0;
    const vivSnap = await getDoc(doc(this.firestore, 'viviendas', reciboDeposito.viviendaId));
    if (vivSnap.exists()) {
      montoMensual = vivSnap.data()['precioMensual'] || 0;
    }

    // Se genera únicamente la factura correspondiente al mes actual/siguiente
    await addDoc(collection(this.firestore, 'facturas'), {
      clienteId: reciboDeposito.clienteId,
      viviendaId: reciboDeposito.viviendaId,
      nombreCliente: reciboDeposito.nombreCliente,
      vivienda: reciboDeposito.vivienda,
      monto: montoMensual,
      tipo: 'mensual',
      estadoPago: 'pendiente',
      fechaEmision: fechaActual,
      fechaVence: fechaVence,
      numeroFactura: 'FAC-' + Math.floor(Math.random() * 100000),
      nota: 'Factura mensual generada automáticamente tras el depósito.'
    });
  }

  async verificarYGenerarFacturasMensualesCiclo() {
    try {
      const facturasRef = collection(this.firestore, 'facturas');
      const querySnapshot = await getDocs(facturasRef);
      const hoy = new Date();

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

      for (const [viviendaId, ultimaFactura] of ultimasFacturasPorVivienda.entries()) {
        let fechaEmisionBase = new Date(ultimaFactura.fechaEmisionDate);

        // Bucle while para generar facturas consecutivas si el ciclo superó uno o más meses
        while (true) {
          const nuevaFechaEmision = new Date(fechaEmisionBase);
          nuevaFechaEmision.setMonth(nuevaFechaEmision.getMonth() + 1);

          // Si la fecha de la nueva factura ya pasó o es hoy, la generamos
          if (hoy >= nuevaFechaEmision) {
            const fechaVence = new Date(nuevaFechaEmision);
            fechaVence.setDate(fechaVence.getDate() + 30);

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
              nota: 'Factura mensual generada automáticamente por ciclo.'
            });

            // Actualizamos la base para evaluar si hay otro mes pendiente en cadena
            fechaEmisionBase = nuevaFechaEmision;
          } else {
            break; // Si aún no se cumple el siguiente mes, rompemos el ciclo
          }
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