import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, AlertOptions, LoadingController, ModalController, ModalOptions, ToastController, ToastOptions } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Network } from '@capacitor/network';
import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le';
import { Chart } from 'chart.js/auto';

@Injectable({
  providedIn: 'root'
})

export class UtilsService {
  onDataReceived: Subject<any> = new Subject<any>();
  deviceSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  loadingCtrl = inject(LoadingController);
  toastCtrl = inject(ToastController);
  modalCtrl = inject(ModalController);
  router = inject(Router);
  alertCtrl = inject(AlertController);
  chart: Chart;

  VITAL_SENSE = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
  VITAL_SENSE_C = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';
  VITAL_SENSE_D = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';

  getOnlineStatus(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      const getStatus = async () => {
        const status = await Network.getStatus();
        observer.next(status.connected);
      };

      getStatus(); // Emitir el estado inicial de conexión

      const listener = Network.addListener('networkStatusChange', async status => {
        observer.next(status.connected);
      });

      return () => {
        listener.remove(); // Eliminar el listener cuando ya no sea necesario
      };
    });
  }
  async takePicture(promptLabelHeader: string) {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelHeader,
      promptLabelPhoto: 'Choose from gallery',
      promptLabelPicture: 'Take a photo'
    });
    const base64Image = photo.dataUrl;

    // Obtener el tamaño en bytes de la imagen base64
    const fileSizeInBytes = this.getBase64FileSize(base64Image);

    // Verificar si el tamaño excede el límite máximo
    if (fileSizeInBytes > 500000) {
      // Comprimir la imagen con el factor de compresión especificado
      const compressedBase64Image = await this.compressBase64Image(base64Image, 0);

      // Actualizar el tamaño de la imagen comprimida
      const compressedFileSizeInBytes = this.getBase64FileSize(compressedBase64Image);

      // Verificar nuevamente si el tamaño comprimido excede el límite máximo
      if (compressedFileSizeInBytes > 500000) {
        this.presentToast({
          message: `The captured image exceeds the maximum size allowed. Size after compressing:${compressedFileSizeInBytes}`,
          duration: 1500,
          color: 'success',
          position: 'middle',
          icon: "checkmark-circle-outline"
        })
        throw new Error(`La imagen sigue siendo demasiado grande incluso después de la compresión. ${compressedFileSizeInBytes}`);
      }

      return compressedBase64Image; // Retornar la imagen comprimida
    } else {
      return base64Image; // Retornar la imagen original si no excede el tamaño máximo
    }
  }

  // Función para obtener el tamaño en bytes de una cadena base64
  getBase64FileSize(base64String: string) {
    // Eliminar el encabezado de la cadena base64 para obtener los datos reales de la imagen
    const base64Data = base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    // Calcular la longitud de la cadena en bytes
    const fileSizeInBytes = base64Data.length * (3 / 4);

    return fileSizeInBytes;
  }
  // Función para comprimir una imagen base64 con un factor de compresión especificado
  compressBase64Image(base64Image: string, compressionQuality: number) {
    // Convertir la imagen base64 a un objeto Blob
    const blob = this.dataURItoBlob(base64Image);

    // Comprimir el Blob usando un elemento canvas
    return new Promise<string>((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        // Establecer el tamaño del canvas
        canvas.width = img.width;
        canvas.height = img.height;

        // Dibujar la imagen en el canvas
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Obtener la imagen comprimida como una cadena base64
        const compressedBase64Image = canvas.toDataURL('image/jpeg', compressionQuality);

        // Resolver con la imagen comprimida
        resolve(compressedBase64Image);
      };
      img.onerror = (error) => reject(error);
      img.src = URL.createObjectURL(blob);
    });
  }

  // Función para convertir una cadena base64 a un objeto Blob
  dataURItoBlob(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  }

  //ALERT
  async presentAlert(opts?: AlertOptions) {
    const alert = await this.alertCtrl.create(opts);
    await alert.present();
  }

  //LOAGING
  loading() {
    return this.loadingCtrl.create({ spinner: "bubbles" })
  }

  //TOAST
  async presentToast(opts?: ToastOptions) {
    const toast = await this.toastCtrl.create(opts);
    toast.present();
  }
  //ENRUTA LA PAGINA DISPONIBLE
  routerLink(url: string) {
    return this.router.navigateByUrl(url);
  }

  saveInLocalStorage(key: string, value: any) {
    return localStorage.setItem(key, JSON.stringify(value))
  }

  getFromLocalStorage(key: string) {
    return JSON.parse(localStorage.getItem(key))
  }

  //MODAL
  async presentModal(opts: ModalOptions) {
    const modal = await this.modalCtrl.create(opts);
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) return data;
  }
  dismissModal(data?: any) {
    return this.modalCtrl.dismiss(data);

  }

  ///////////////////////////BLUETOOTH///////////////////////////
  device: any; // Declarar la variable device como una propiedad de la clase

  async initBLE() {
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      console.log('Bluetooth initialized');
      this.device = await BleClient.requestDevice({
        services: [this.VITAL_SENSE],
      });
      console.log('Device paired', this.device);
      await BleClient.connect(this.device.deviceId, (deviceId) => this.onDisconnect(deviceId));
      console.log('Connected to device', this.device);

      // Suscribirse a las notificaciones de la característica de lectura
      await BleClient.startNotifications(
        this.device.deviceId,
        this.VITAL_SENSE, // Reemplaza SERVICE_UUID con el UUID de tu servicio BLE
        this.VITAL_SENSE_C, // Reemplaza CHARACTERISTIC_UUID con el UUID de tu característica BLE
        (value) => {
          this.onDataReceived.next(parseFloat(String.fromCharCode.apply(null, new Uint8Array(value.buffer))));
        }
      );
      this.deviceSubject.next(this.device);
      this.presentToast({
        message: `conectado a ${this.device.name}`,
        duration: 2500,
        color: 'success',
        position: 'middle',
        icon: "alert-circle-outline"
      })

    } catch (error) {
      console.log(error);
      this.presentToast({
        message: error,
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: "alert-circle-outline"
      })
    }
  }

  onDisconnect(deviceId: string): void {
    console.log(`Device ${deviceId} disconnected`);
    this.presentToast({
      message: `Desconectado de ${this.device.deviceId}`,
      duration: 2500,
      color: 'warning',
      position: 'middle',
      icon: "alert-circle-outline"
    });
    this.device = ""; // Reiniciar el dispositivo en utils.service.ts
    this.deviceSubject.next(this.device);
  }

  async writeBLE(value: any) {
    if (this.device) {
      try {
        await BleClient.write(this.device.deviceId, this.VITAL_SENSE, this.VITAL_SENSE_D, numbersToDataView(value));
        console.log("mensaje enviado", value);
      } catch (error) {
        console.log('Error writing data:', error);
      }
    }
  }



  async discBLE() {
    if (this.device) {
      try {
        await BleClient.stopNotifications(this.device.deviceId, this.VITAL_SENSE, this.VITAL_SENSE_C);
        await BleClient.disconnect(this.device.deviceId);
        this.device = "";
      } catch (error) {
        console.log(error);
      }
    }
  }
  ////////////////////GRAFICO////////////////////////

  async updateChartWithArrayData(dataArray: number[]) {
    if (!this.chart) {
      this.initChart();
    }

    this.chart.data.labels = Array(dataArray.length).fill('');
    this.chart.data.datasets.forEach(dataset => {
      dataset.data = dataArray.slice();
    });

    // Actualizar el gráfico
    this.chart.update();
  }

  adjAxesi() {
    this.chart.options = {
      maintainAspectRatio: true, // Mantener el aspecto del gráfico
      responsive: true, // Permitir que el gráfico sea responsive
      scales: {
        y: {
          min: 20000, // Valor mínimo en el eje Y
          max: 50000, // Valor máximo en el eje Y            
        }
      }
    }
  }
  adjAxesf() {
    this.chart.options = {
      maintainAspectRatio: true, // Mantener el aspecto del gráfico
      responsive: true, // Permitir que el gráfico sea responsive
      scales: {
        y: {
          min: 10000, // Valor mínimo en el eje Y
          max: 70000, // Valor máximo en el eje Y            
        }
      }
    }
  }
  initChart() {
    var dataFirst = {
      label: "ECG",
      data: [],
      lineTension: .3,
      fill: false,
      borderColor: 'red'
    };
    // var dataSecond = {
    //   label: "Car B - Speed (mph)",
    //   data: [20, 15, 60, 60, 65, 30, 70],
    //   lineTension: 0,
    //   fill: false,
    // borderColor: 'blue'
    // };

    var speedData = {
      labels: [],
      datasets: [dataFirst]
    };

    this.chart = new Chart('canvas', {
      type: 'line',
      data: speedData,
      options: {
        maintainAspectRatio: true, // Mantener el aspecto del gráfico
        responsive: true, // Permitir que el gráfico sea responsive
        scales: {
          y: {
            min: 20000, // Valor mínimo en el eje Y
            max: 50000, // Valor máximo en el eje Y            
          }
        }
      }
    });
  }

}
