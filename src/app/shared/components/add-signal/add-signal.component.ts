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
  device:any;
  deviceSubscription: Subscription; // Suscripción al Subject en UtilsService
  onDataReceivedSubscription: Subscription;
  regActual: any[] = []; // Arreglo para almacenar los datos recibidos

  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage('user');
    this.form.controls.patient.setValue(this.product.id);
    this.utilsSvc.initChart();
    this.regActual=[];

    // Suscribirse a los datos recibidos del dispositivo BLE
    this.onDataReceivedSubscription = this.utilsSvc.onDataReceived.subscribe(async data => {
      this.regActual.push(data); // Agregar los datos al arreglo regActual
      if (this.regActual.length == 1000) {
        await this.utilsSvc.writeBLE([2]);
        this.utilsSvc.adjAxesf();
        await this.utilsSvc.updateChartWithArrayData(this.regActual);
      }
      if (this.regActual.length > 100 && this.regActual.length%80==0){
        let signalV=this.regActual.slice(-101,-1);
        await this.utilsSvc.updateChartWithArrayData(signalV);
      }
      //this.utilsSvc.addDataToChart(data);
    });
    this.deviceSubscription = this.utilsSvc.deviceSubject.subscribe((device) => {
      this.device = device;
    });
  }
  ngOnDestroy(){
    if (this.onDataReceivedSubscription) {
      this.onDataReceivedSubscription.unsubscribe();
    }
    if (this.deviceSubscription) {
      this.deviceSubscription.unsubscribe();
    }
    this.utilsSvc.discBLE();

  }

  async pairBLE(){
    this.utilsSvc.initBLE();
  }
  async takeReg(){
    this.regActual=[];
    this.utilsSvc.updateChartWithArrayData(this.regActual);
    this.utilsSvc.adjAxesi();
    await this.utilsSvc.writeBLE([1]);
  }
  async stopRec(){
    await this.utilsSvc.writeBLE([2]);
  }

  async discBLE(){
    await this.utilsSvc.discBLE();
  }
  
  async submit() {
    if (this.form.valid) {
      //this.createRecord();
    }
  }

  // Función para agregar un retardo
  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


  form = new FormGroup({
    patient: new FormControl(''),
    date: new FormControl(''),
    frecCard: new FormControl(null, [Validators.required]), 
    tempCorp: new FormControl(null, [Validators.required]),
    frecResp: new FormControl(null, [Validators.required]),

    observation: new FormControl('', [Validators.required]),
    URLarchive: new FormControl('', [Validators.required])
  })
  
  setNumberInputs() {
    let { frecCard, tempCorp, frecResp } = this.form.controls;
    if (frecCard.value) frecCard.setValue(parseFloat(frecCard.value))
    if (tempCorp.value) tempCorp.setValue(parseFloat(tempCorp.value))
    if (frecResp.value) frecResp.setValue(parseFloat(frecResp.value))
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
    let currentDate = new Date(Date.now());
    this.form.controls.date.setValue(this.getFormatedDate(currentDate));

    if (this.isConnected) {
      let path = `users/${this.user.uid}/patients/${this.product.id}/records/${this.getFormatedDate(currentDate)}`;
      this.firebaseSvc.setDocument(path, this.form.value).then(async res => {

        // //subir imagen y botener la url
        // let dataUrl = this.form.value.image;
        // if (dataUrl) {
        //   let imagePath = `${this.user.uid}/${res.id}/${Date.now()}`;
        //   let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

        //   path = `users/${this.user.uid}/patients/${res.id}`
        //   await this.firebaseSvc.updateDocument(path, { URLim: imageUrl });
        // }

        this.utilsSvc.dismissModal({ succes: true });

        this.utilsSvc.presentToast({
          message: 'Record added',
          duration: 1500,
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
      let recordWithProvisionalId = { ...this.form.value };
      let records = this.utilsSvc.getFromLocalStorage('records') || []; // Obtener los productos del almacenamiento local o crear un nuevo array si no existen
      records.push(recordWithProvisionalId); // Agregar el formulario al array de productos
      this.utilsSvc.saveInLocalStorage('records', records); // Guardar los productos actualizados en el almacenamiento local

      this.utilsSvc.dismissModal({ succes: true });

      this.utilsSvc.presentToast({
        message: 'Record added assyncly',
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: "checkmark-circle-outline"
      })
      loading.dismiss();
    }

  }

}
