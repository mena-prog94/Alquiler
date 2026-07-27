import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, 
  IonCard, IonCardContent, IonBadge, IonItem, IonLabel, IonButton, IonIcon 
} from '@ionic/angular/standalone';
import { AlertController, ToastController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Importación correcta de AngularFire Firestore
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';

import { addIcons } from 'ionicons';
import { 
  personOutline, homeOutline, calendarOutline, logoWhatsapp, 
  printOutline, documentTextOutline, cashOutline, checkmarkCircleOutline, shareSocialOutline 
} from 'ionicons/icons';

// Importar jsPDF para la creación de recibos en PDF
import jsPDF from 'jspdf';

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
    addIcons({ 
      personOutline, homeOutline, calendarOutline, logoWhatsapp, 
      printOutline, cashOutline, documentTextOutline, checkmarkCircleOutline, shareSocialOutline 
    });
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

  // 3. GENERAR PDF Y COMPARTIR POR WHATSAPP DIRECTAMENTE
  async compartirWhatsApp() {
    if (!this.recibo) return;

    try {
      // Leemos el teléfono directamente del documento actual de la factura
      const telefono = this.recibo.telefono;

      if (!telefono) {
        alert("Este recibo no tiene un número de teléfono asociado en la base de datos.");
        return;
      }

      // Crear documento PDF con jsPDF
      const docPdf = new jsPDF();
      
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(20);
      docPdf.text("RECIBO DE PAGO", 105, 20, { align: "center" });
      
      docPdf.setFontSize(12);
      docPdf.setFont("helvetica", "normal");
      docPdf.text("Maria Aquino", 105, 28, { align: "center" });
      docPdf.line(20, 35, 190, 35);

      let fechaFormateada = "No especificada";
      if (this.recibo.fechaEmision && typeof this.recibo.fechaEmision.toDate === 'function') {
        fechaFormateada = this.recibo.fechaEmision.toDate().toLocaleDateString();
      }

      const vivienda = this.recibo.viviendaAsignada || this.recibo.vivienda || "No especificada";
      const montoStr = this.recibo.monto ? `$${this.recibo.monto.toFixed(2)}` : '$0.00';
      const estadoStr = this.recibo.estadoPago === 'pagado' ? 'PAGADO ✅' : 'PENDIENTE ❌';

      // Estructura de contenido del PDF
      docPdf.text(`Número de Factura: ${this.recibo.numeroFactura}`, 20, 50);
      docPdf.text(`Cliente: ${this.recibo.nombreCliente}`, 20, 60);
      docPdf.text(`Teléfono: ${telefono}`, 20, 70);
      docPdf.text(`Casa Asignada: ${vivienda}`, 20, 80);
      docPdf.text(`Fecha de Emisión: ${fechaFormateada}`, 20, 90);
      docPdf.text(`Monto: ${montoStr}`, 20, 100);
      docPdf.text(`Estado: ${estadoStr}`, 20, 110);
      
      docPdf.line(20, 120, 190, 120);
      docPdf.text("Este es un recibo emitido por Maria Aquino.", 105, 135, { align: "center" });

      // Convertir PDF a Base64
      const pdfOutput = docPdf.output('datauristring');
      const base64Data = pdfOutput.split(',')[1];
      const fileName = `Recibo_${this.recibo.numeroFactura}.pdf`;

      // Guardar temporalmente en el dispositivo
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // Compartir nativamente (permite enviar el archivo PDF directo a WhatsApp)
      await Share.share({
        title: 'Recibo de Pago',
        text: `Hola ${this.recibo.nombreCliente}, adjunto aquí tu recibo de pago correspondiente a la factura #${this.recibo.numeroFactura}.`,
        url: savedFile.uri,
        dialogTitle: 'Compartir Recibo PDF'
      });

    } catch (error) {
      console.error("Error al generar o compartir el PDF por WhatsApp:", error);
      alert("Hubo un error al procesar el archivo PDF.");
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