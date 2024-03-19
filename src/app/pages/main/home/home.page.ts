import { Component, OnInit, inject } from '@angular/core';
import { Product } from 'src/app/models/product.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { orderBy, where } from 'firebase/firestore';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  products: Product[] = [];
  loading:boolean=false;

  showSubmenu: string = "";

  constructor() { }

  ngOnInit() {
  }

  signOut() {
    this.firebaseSvc.signOut();
  }

  //REGRESAR LOS DATOS DEL USUARIO
  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }
  //EJECUTAR UNA FUNCION CADA QUE EL USUARIO ENTRE A LA PAGINA
  ionViewWillEnter() {
    this.getProducts();
  }

  //REFRESHER
  doRefresh(event) {
    setTimeout(() => {
      this.getProducts();
      event.target.complete();
    }, 1000);
  }


  //OBTENER PRODUCTOS
  getProducts() {
    let path = `users/${this.user().uid}/patients`;
    this.loading=true;
    let query = [
      orderBy('age', 'desc'),
      where('age', '>=', 5)
    ]
    
    let sub = this.firebaseSvc.getCollectionData(path,query).subscribe({
      next: (res: any) => {
        console.log(res);
        this.products = res;
        this.loading=false;
        sub.unsubscribe();
      }
    })
  }
  //AGREGAR O ACTUALIZAR PACIENTE
  async addUpdateProduct(product?: Product) {
    let success = await this.utilsSvc.presentModal({
      component: AddUpdateProductComponent,
      cssClass: 'add-update-modal',
      componentProps: { product }
    })
    if (success) this.getProducts();
  }

  async confirmDeleteProduct(product: Product) {
    this.utilsSvc.presentAlert({
      header: 'Delete patient',
      message: 'Do you want to delete this patient?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancel',
        }, {
          text: 'Yes, delete',
          handler: () => {
            this.deleteProduct(product)
          }
        }
      ]
    });
  }

  //ELIMINAR PRODUCTO
  async deleteProduct(product: Product) {

    let path = `users/${this.user().uid}/patients/${product.id}`;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    let imagePath = await this.firebaseSvc.getFilePath(product.image);
    await this.firebaseSvc.deleteFile(imagePath);

    this.firebaseSvc.deleteDocument(path).then(async res => {

      this.products = this.products.filter(p => p.id != product.id);

      this.utilsSvc.presentToast({
        message: 'Patient eliminated',
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

  toggleSubmenu(option: string) {
    if (this.showSubmenu === option) {
      this.showSubmenu = '';
    } else {
      this.showSubmenu = option;
    }
  }
}