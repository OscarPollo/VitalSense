import { Component, OnInit, inject } from '@angular/core';
import { Product } from 'src/app/models/product.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AddUpdateProductComponent } from 'src/app/shared/components/add-update-product/add-update-product.component';
import { AddSignalComponent } from 'src/app/shared/components/add-signal/add-signal.component';
import { orderBy, where } from 'firebase/firestore';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  products: Product[] = [];
  loading: boolean = false;

  showSubmenu: string = "";

  isConnected: boolean;
  onlineSubscription: Subscription;
  previousConnectionState: boolean;

  ngOnInit() {
    console.log("desde el ngOnInit");
    this.onlineSubscription = this.utilsSvc.getOnlineStatus().subscribe(async online => {
      this.loading = true;
      if (!this.previousConnectionState && online) {
        // Si la conexión cambia de 'false' a 'true', ejecuta la función syncCambios
        await this.syncCambios();
        this.isConnected = online;
      }
      this.previousConnectionState = online;
      this.isConnected = online;
      this.getProducts();
      this.loading = false;
    });
  }
  ngOnDestroy() {
    console.log("desde el ondestroy");
    if (this.onlineSubscription) {
      this.onlineSubscription.unsubscribe();
    }
  }

  //EJECUTAR UNA FUNCION CADA QUE EL USUARIO ENTRE A LA PAGINA
  // ionViewWillEnter() {
  //   console.log("desde el ionviewwillenter");
  //   this.getProducts();
  // }

  //REFRESHER
  doRefresh(event) {
    setTimeout(() => {
      this.getProducts();
      event.target.complete();
    }, 1000);
  }

  signOut() {
    this.firebaseSvc.signOut();
  }

  //REGRESAR LOS DATOS DEL USUARIO
  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }

  async syncCambios() {
    const products: any[] = this.utilsSvc.getFromLocalStorage('products') || [];
    const records: any[] = this.utilsSvc.getFromLocalStorage('records') || [];

    for (const product of products) {
      if (product.id.startsWith("provisional_")) {// Si el producto tiene un ID provisional, significa que es nuevo, por lo tanto, lo creamos
        let prevId = product.id;
        let idNew = await this.createProduct(product);
        product.id = idNew;
        for (const record of records) {
          if (prevId === record.patient) {
            record.patient = idNew;
            await this.createRecord(record, idNew);
          }
        }
      } else {// Si el producto tiene un ID, significa que ya existe, por lo tanto, lo actualizamos
        console.log(product.id)
        for (const record of records) {
          console.log(record.patient)
          if (product.id === record.patient) {  
            console.log("si coinciden")
            await this.createRecord(record, product.id.toString());
          }
        }
        await this.updateProduct(product);
      }
    }
    localStorage.removeItem('records');
    this.utilsSvc.presentToast({
      message: 'Data patients synchronized. DONT FORGET reload the page',
      duration: 2000,
      color: 'success',
      position: 'middle',
      icon: "checkmark-circle-outline"
    });
  }

  async createRecord(record: any, newProductId: string) {
    let path = `users/${this.user().uid}/patients/${newProductId}/records/${record.date}`;
    this.firebaseSvc.setDocument(path, record).then(async res => {
      // //subir imagen y botener la url
      // let dataUrl = this.form.value.image;
      // if (dataUrl) {
      //   let imagePath = `${this.user.uid}/${res.id}/${Date.now()}`;
      //   let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

      //   path = `users/${this.user.uid}/patients/${res.id}`
      //   await this.firebaseSvc.updateDocument(path, { URLim: imageUrl });
      // }
    }).catch(error => {
      console.log(error);
      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: "alert-circle-outline"
      })
    })
  }

  async createProduct(product: Product): Promise<string> {
    let newPath: string;
    return new Promise((resolve, reject) => {
      delete product.id;
      let path = `users/${this.user().uid}/patients`;

      this.firebaseSvc.addDocument(path, product)
        .then(async (res) => {
          newPath = res.id;

          // Subir imagen y obtener la URL si existe
          if (product.image) {
            let dataUrl = product.image;
            let imagePath = `${this.user().uid}/${res.id}/${Date.now()}`;
            let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

            path = `users/${this.user().uid}/patients/${res.id}`;
            await this.firebaseSvc.updateDocument(path, { URLim: imageUrl });
          }

          resolve(newPath); // Resuelve la promesa con el ID del nuevo documento
        })
        .catch((error) => {
          console.log(error);
          this.utilsSvc.presentToast({
            message: error.message,
            duration: 2500,
            color: 'danger',
            position: 'middle',
            icon: "alert-circle-outline"
          });
          reject(error); // Rechaza la promesa con el error
        });
    });
  }
  async updateProduct(product: Product) {
    let path = `users/${this.user().uid}/patients/${product.id}`;

    //subir imagen y botener la url si cambio la imagen
    if (product.image) {
      let dataUrl = product.image;
      let imagePath = `${this.user().uid}/${product.id}/${Date.now()}`;
      if (product.URLim) {
        imagePath = await this.firebaseSvc.getFilePath(product.URLim);
      }
      let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);
      product.URLim = imageUrl;
    }


    delete product.id;

    this.firebaseSvc.updateDocument(path, product).then(async res => {

    }).catch(error => {
      console.log(error);
      this.utilsSvc.presentToast({
        message: error.message,
        duration: 2500,
        color: 'danger',
        position: 'middle',
        icon: "alert-circle-outline"
      })
    })
  }
  //OBTENER PRODUCTOS
  getProducts() {
    console.log(this.isConnected);
    if (this.isConnected) {
      let path = `users/${this.user().uid}/patients`;
      let query = [
        // orderBy('age', 'desc'),
        // where('age', '>=', 0)
      ]

      let sub = this.firebaseSvc.getCollectionData(path, query).subscribe({
        next: (res: any) => {
          this.products = res;
          console.log("datos del firebase")
          console.log(this.products);
          this.utilsSvc.saveInLocalStorage('products', res);
          this.loading = false;
          sub.unsubscribe();
        },
        error: (error) => {
          console.error('Error fetching data from Firebase:', error);
          this.loading = false;
        }
      });
    } else {
      // Estamos fuera de línea, obtenemos los datos del almacenamiento local
      let productsFromLocalStorage = this.utilsSvc.getFromLocalStorage('products');

      if (productsFromLocalStorage) {
        this.products = productsFromLocalStorage;
        console.log("datos del localstorage")
        console.log(this.products);
      } else {
        console.error('No products found in local storage');
      }
      this.loading = false;
    }
  }
  //AGREGAR O ACTUALIZAR PACIENTE
  async addSignal(product?: Product) {
    let success = await this.utilsSvc.presentModal({
      component: AddSignalComponent,
      cssClass: 'add-update-modal',
      componentProps: {
        product,
        isConnected: this.isConnected
      }
    })
    if (success) this.getProducts();
  }
  //AGREGAR O ACTUALIZAR PACIENTE
  async addUpdateProduct(product?: Product) {
    let success = await this.utilsSvc.presentModal({
      component: AddUpdateProductComponent,
      cssClass: 'add-update-modal',
      componentProps: {
        product,
        isConnected: this.isConnected
      }
    })
    if (success) this.getProducts();
  }
  //CONFIRMAR BORRAR PACIENTE
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

    let imagePath = await this.firebaseSvc.getFilePath(product.URLim);
    if (imagePath) {
      await this.firebaseSvc.deleteFile(imagePath);
    }
    this.firebaseSvc.deleteSubcollection(path,"records");
    this.firebaseSvc.deleteDocument(path).then(async res => {

      this.getProducts();

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