import { Component, Input, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Product } from 'src/app/models/product.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
@Component({
  selector: 'app-add-signal',
  templateUrl: './add-signal.component.html',
  styleUrls: ['./add-signal.component.scss'],
})
export class AddSignalComponent implements OnInit {
  @Input() isConnected: boolean;
  @Input() product: Product;

  user = {} as User;

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  device: any;
  deviceSubscription: Subscription; // Suscripción al Subject en UtilsService
  onDataReceivedSubscription: Subscription;
  regActual: any[] = []; // Arreglo para almacenar los datos recibidos

  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage('user');
    this.utilsSvc.initChart();
    this.utilsSvc.rejectZoomPan();
    this.regActual = [];

    // Suscribirse a los datos recibidos del ECG
    this.onDataReceivedSubscription = this.utilsSvc.onDataReceived.subscribe(async data => {
      const prefix = data.substring(0, 3); // Obtener los primeros 3 caracteres como prefijo
      if (prefix === "tem") {
        const dataBPM = parseFloat(data.substring(3)); // Quitar el prefijo y convertir a número
        this.form.controls.tempCorp.setValue(dataBPM);
        this.setNumberInputs();
      }
      else if (prefix === "ecg") {
        // Los datos son del ECGthis.onDataReceivedECG.next(
        const dataECG = parseFloat(data.substring(3)); // Quitar el prefijo y convertir a número
        this.regActual.push(dataECG); // Agregar los datos al arreglo regActual
        if (this.regActual.length > 120 && this.regActual.length % 100 == 0) {
          let signalV = this.regActual.slice(-121, -1);
          await this.utilsSvc.updateChartWithArrayData(signalV);
        }
        if (this.regActual.length == 1200) {
          await this.utilsSvc.writeBLE([2]);
          await this.utilsSvc.updateChartWithArrayData(this.regActual);
          this.utilsSvc.permitZoomPan();
        }
        
      }
      else if (prefix === "bpm") {
        const dataBPM = parseFloat(data.substring(3)); // Quitar el prefijo y convertir a número
        this.form.controls.frecCard.setValue(dataBPM);
        this.setNumberInputs();
      }

    });
    // Suscribirse a el dispositivo conectado
    this.deviceSubscription = this.utilsSvc.deviceSubject.subscribe((device) => {
      this.device = device;
    });
  }
  ngOnDestroy() {
    if (this.onDataReceivedSubscription) {
      this.onDataReceivedSubscription.unsubscribe();
    }
    if (this.deviceSubscription) {
      this.deviceSubscription.unsubscribe();
    }
    this.utilsSvc.discBLE();

  }

  async pairBLE() {
    this.utilsSvc.initBLE();
  }
  async takeReg() {
    this.form.reset();

    this.form.controls.patient.setValue(this.product.id);

    let currentDate = new Date(Date.now());
    this.form.controls.date.setValue(this.getFormatedDate(currentDate));

    this.utilsSvc.rejectZoomPan();
    this.utilsSvc.resetAxes();
    this.regActual = [];
    this.utilsSvc.updateChartWithArrayData(this.regActual);
    await this.utilsSvc.writeBLE([1]);
  }
  async stopRec() {
    await this.utilsSvc.writeBLE([2]);
    this.utilsSvc.resetAxes();
    await this.utilsSvc.updateChartWithArrayData(this.regActual);
    this.utilsSvc.permitZoomPan();
  }

  async discBLE() {
    await this.utilsSvc.discBLE();
  }

  async submit() {
    if (this.form.valid) {
      this.createRecord();
    }
  }

  // Función para agregar un retardo
  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  form = new FormGroup({
    patient: new FormControl('', [Validators.required]),
    date: new FormControl('', [Validators.required]),
    frecCard: new FormControl(null, [Validators.required]),
    tempCorp: new FormControl(null, [Validators.required]),

    observation: new FormControl('', [Validators.required]),
    URLarchive: new FormControl('')
  })

  setNumberInputs() {
    let { frecCard, tempCorp } = this.form.controls;
    if (frecCard.value) frecCard.setValue(parseFloat(frecCard.value))
    if (tempCorp.value) tempCorp.setValue(parseFloat(tempCorp.value))
  }
  getFormatedDate(currentDate: Date): string {
    const year = currentDate.getFullYear();
    const month = ('0' + (currentDate.getMonth() + 1)).slice(-2); // Añade un cero al mes si es necesario
    const day = ('0' + currentDate.getDate()).slice(-2); // Añade un cero al día si es necesario
    const hours = ('0' + currentDate.getHours()).slice(-2); // Añade un cero a las horas si es necesario
    const minutes = ('0' + currentDate.getMinutes()).slice(-2); // Añade un cero a los minutos si es necesario
    const seconds = ('0' + currentDate.getSeconds()).slice(-2); // Añade un cero a los segundos si es necesario
    const milliseconds = ('00' + currentDate.getMilliseconds()).slice(-3); // Añade ceros a los milisegundos si es necesario

    return `${year}_${month}_${day}_${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  async createRecord() {
    const loading = await this.utilsSvc.loading();
    await loading.present();

    const regJson = JSON.stringify(this.regActual);


    if (this.isConnected) {
      //subir imagen y botener la url
      let regPath = `${this.user.uid}/${this.product.id}/${this.form.controls.date.value.slice(0,-4)}.txt`;
      let regUrl = await this.firebaseSvc.uploadJson(regPath, regJson);
      this.form.controls.URLarchive.setValue(regUrl);

      let path = `users/${this.user.uid}/patients/${this.product.id}/records/${this.form.controls.date.value}`;
      this.firebaseSvc.setDocument(path, this.form.value).then(async res => {
        
        this.utilsSvc.dismissModal({ succes: true });

        this.utilsSvc.presentToast({
          message: 'Record added',
          duration: 3000,
          color: 'success',
          position: 'middle',
          icon: "checkmark-circle-outline"
        })
      }).catch(error => {
        console.log(error);
        this.utilsSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'danger',
          position: 'middle',
          icon: "alert-circle-outline"
        })
      }).finally(() => {
        loading.dismiss();
      })
    } else {
      // Si no estamos conectados, creamos un ID provisional utilizando un timestamp
      this.form.controls.URLarchive.setValue(regJson);
      let recordWithProvisionalId = { ...this.form.value };
      let records = this.utilsSvc.getFromLocalStorage('records') || []; // Obtener los productos del almacenamiento local o crear un nuevo array si no existen
      records.push(recordWithProvisionalId); // Agregar el formulario al array de productos
      this.utilsSvc.saveInLocalStorage('records', records); // Guardar los productos actualizados en el almacenamiento local

      this.utilsSvc.dismissModal({ succes: true });

      this.utilsSvc.presentToast({
        message: 'Record added assyncly',
        duration: 3000,
        color: 'success',
        position: 'middle',
        icon: "checkmark-circle-outline"
      })
      loading.dismiss();
    }

  }

}
