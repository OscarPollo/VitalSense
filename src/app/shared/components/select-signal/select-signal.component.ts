import { Component, Input, OnInit, inject } from '@angular/core';
import { Product } from 'src/app/models/product.model';
import { Registro } from 'src/app/models/registro.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-select-signal',
  templateUrl: './select-signal.component.html',
  styleUrls: ['./select-signal.component.scss'],
})
export class SelectSignalComponent implements OnInit {
  @Input() product: Product;

  user = {} as User;

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  regActual: any[] = []; // Arreglo para almacenar los datos recibidos
  records: Registro[] = [];
  dataSignal: any[]=[];
  loading: boolean = false;

  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage('user');
    this.utilsSvc.initChart();
    this.utilsSvc.rejectZoomPan();
    this.regActual = [];
    this.getRecords();
  }

  //OBTENER REGISTROS
  getRecords() {
    let path = `users/${this.user.uid}/patients/${this.product.id}/records`;
    let query = [
      // orderBy('age', 'desc'),
      // where('age', '>=', 0)
    ]

    let sub = this.firebaseSvc.getCollectionData(path, query).subscribe({
      next: (res: any) => {
        this.records = res;
        this.loading = false;
        sub.unsubscribe();
      },
      error: (error) => {
        console.error('Error fetching data from Firebase:', error);
        this.loading = false;
      }
    });
  } 
  
  showSignal(signal: Registro) {
    this.firebaseSvc.downloadFile(signal.URLarchive)
      .then(response => {
        this.regActual=response;
        this.utilsSvc.updateChartWithArrayData(this.regActual);
        this.utilsSvc.permitZoomPan();
      })
      .catch(error => {
        console.error('Error downloading file:', error);
      });
  }
  async deleteSignal(signal:Registro){
    let path = `users/${this.user.uid}/patients/${this.product.id}/records/${signal.date}`;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    let recordPath = await this.firebaseSvc.getFilePath(signal.URLarchive);
    await this.firebaseSvc.deleteFile(recordPath);
    this.firebaseSvc.deleteDocument(path).then(async res => {

      this.getRecords();

      this.utilsSvc.presentToast({
        message: 'Record eliminated',
        duration: 1500,
        color: 'warning',
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
  }
  confirmDeleteSignal(signal:Registro){
    this.utilsSvc.presentAlert({
      header: 'Delete Record',
      message: 'Do you want to delete this record?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancel',
        }, {
          text: 'Yes, delete',
          handler: () => {
            this.deleteSignal(signal)
          }
        }
      ]
    });
  }

}
  
