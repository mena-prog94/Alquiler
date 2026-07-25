import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonCard, IonCardContent, IonBadge, IonItem, IonLabel, IonButton, IonIcon 
} from '@ionic/angular/standalone';
import { AlertController, ToastController } from '@ionic/angular';
import { Browser } from '@capacitor/browser';

// Importación correcta de AngularFire Firestore
import { Firestore, doc, getDoc, updateDoc, collection, query, where, getDocs, limit } from '@angular/fire/firestore';

import { addIcons } from 'ionicons';
import { 
  personOutline, homeOutline, calendarOutline, logoWhatsapp, 
  printOutline, documentTextOutline, cashOutline, checkmarkCircleOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-detalle-recibo',
  templateUrl: './detalle-recibo.page.html',
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonCard, IonCardContent, IonBadge, IonItem, IonLabel, IonButton, IonIcon
  ]
})
export class DetalleReciboPage implements OnInit {
  // Inyección moderna de Firestore
  private firestore = inject(Firestore);

  private route = inject(ActivatedRoute);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  
  recibo: any = null;

  constructor() {
    addIcons({ personOutline, homeOutline, calendarOutline, logoWhatsapp, printOutline, cashOutline, documentTextOutline, checkmarkCircleOutline });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) await this.cargarDetalleRecibo(id);
  }

  // 1. CARGAMOS EL RECIBO (AngularFire)
  async cargarDetalleRecibo(id: string) {
    const docRef = doc(this.firestore, 'facturas', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      this.recibo = { id: docSnap.id, ...docSnap.data() };
    }
  }

  get estadoVencimiento() {
    if (!this.recibo || this.recibo.estadoPago === 'pagado') return { texto: 'Pagado', color: 'success' };
    return { texto: 'Pendiente', color: 'danger' };
  }

  async confirmarRegistroPago() {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar',
      message: '¿Registrar pago como realizado?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: () => this.registrarPago() }
      ],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  // 2. ACTUALIZAMOS EL PAGO (AngularFire)
  async registrarPago() {
    const docRef = doc(this.firestore, 'facturas', this.recibo.id);
    await updateDoc(docRef, { estadoPago: 'pagado', fechaPago: new Date() });
    this.recibo.estadoPago = 'pagado';
    const toast = await this.toastCtrl.create({ message: 'Pago registrado!', duration: 2000, color: 'success' });
    await toast.present();
  }

  async compartirWhatsApp() {
    if (!this.recibo) return;

    try {
      // 1. Buscamos al cliente (AngularFire)
      const clientesRef = collection(this.firestore, 'clientes');
      const q = query(clientesRef, where('nombreCompleto', '==', this.recibo.nombreCliente), limit(1));
      const querySnapshot = await getDocs(q);
      const telefono = !querySnapshot.empty ? querySnapshot.docs[0].data()['telefono'] : null;

      if (!telefono) {
        alert("No se pudo obtener el teléfono del cliente.");
        return;
      }

      // 2. Convertimos la fecha si existe
      let fechaFormateada = "No especificada";
      if (this.recibo.fechaEmision && typeof this.recibo.fechaEmision.toDate === 'function') {
        fechaFormateada = this.recibo.fechaEmision.toDate().toLocaleDateString();
      }

      // 3. Construimos el mensaje
      const vivienda = this.recibo.viviendaAsignada || this.recibo.vivienda || "No especificada";

      const mensaje = `*RECIBO DE PAGO*
Maria Aquino
--------------------------

*Factura #:* ${this.recibo.numeroFactura}
*Cliente:* ${this.recibo.nombreCliente}
*Casa asignada:* ${vivienda}
*Fecha de emisión:* ${fechaFormateada}
*Monto:* $${this.recibo.monto ? this.recibo.monto.toFixed(2) : '0.00'}
*Estado:* ${this.recibo.estadoPago === 'pagado' ? 'PAGADO ✅' : 'PENDIENTE ❌'}
--------------------------
Este es un recibo emitido por Maria Aquino.`;

      const url = `https://wa.me/${telefono.toString().replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
      await Browser.open({ url: url });

    } catch (error) {
      console.error("Error al preparar el mensaje:", error);
    }
  }

  imprimirRecibo() {
    const printSection = document.getElementById('print-section');
    if (!printSection) return;

    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <style>
              body { font-family: 'Arial', sans-serif; padding: 50px; color: #000; }
              .status-card { border: 1px solid #000; padding: 20px; margin-bottom: 20px; text-align: center; }
              h2 { font-size: 30px; margin: 10px 0; }
              .signatures-wrapper { display: flex; justify-content: space-between; margin-top: 100px; }
              .signature-container { text-align: center; width: 40%; }
              .signature-line { border-top: 2px solid #000; width: 100%; margin-bottom: 10px; }
            </style>
          </head>
          <body>${printSection.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  }
}