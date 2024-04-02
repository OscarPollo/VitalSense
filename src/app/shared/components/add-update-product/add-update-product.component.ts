import { Component, Input, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Product } from 'src/app/models/product.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-add-update-product',
  templateUrl: './add-update-product.component.html',
  styleUrls: ['./add-update-product.component.scss'],
})
export class AddUpdateProductComponent implements OnInit {

  @Input() product: Product;
  @Input() isConnected: boolean;   

  form = new FormGroup({
    id: new FormControl(''),
    name: new FormControl("", [Validators.required]),
    age: new FormControl(null, [Validators.required, Validators.min(0)]), // Se agrega validación para que la edad sea un número mayor o igual a cero
    gender: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl(null, [Validators.required, Validators.pattern(/^\d{10}$/)]), // Se agrega validación para que el número de teléfono tenga 10 dígitos
    observation: new FormControl('', [Validators.required]),
    image: new FormControl(''),
    URLim: new FormControl('')
  })

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  user = {} as User;
  ngOnInit() {
    this.user = this.utilsSvc.getFromLocalStorage('user');
    if (this.product) this.form.setValue(this.product);
  }
  //TOMAR/SELECCIONAR UNA FOTO
  async takeImage() {
    const dataUrl = (await this.utilsSvc.takePicture("Patient photo"));
    this.form.controls.image.setValue(dataUrl);
  }
  //Convierte string a numeros
  setNumberInputs() {
    let { age, phoneNumber } = this.form.controls;
    if (age.value) age.setValue(parseFloat(age.value))
    if (phoneNumber.value) phoneNumber.setValue(parseFloat(phoneNumber.value))
  }
  submit() {
    if (this.form.valid) {
      if (this.product) this.updateProduct();
      else this.createProduct();
    }

  }

  async createProduct() {
    const loading = await this.utilsSvc.loading();
    await loading.present();
    if (this.isConnected) {
      delete this.form.value.id;

      let path = `users/${this.user.uid}/patients`;

      this.firebaseSvc.addDocument(path, this.form.value).then(async res => {

        //subir imagen y botener la url
        let dataUrl = this.form.value.image;
        if (dataUrl) {
          let imagePath = `${this.user.uid}/${res.id}/${Date.now()}`;
          let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

          path = `users/${this.user.uid}/patients/${res.id}`
          await this.firebaseSvc.updateDocument(path, { URLim: imageUrl });
        }

        this.utilsSvc.dismissModal({ succes: true });

        this.utilsSvc.presentToast({
          message: 'Patient added',
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
      const provisionalId = `provisional_${Date.now().toString()}`;
      let productWithProvisionalId = { ...this.form.value, id: provisionalId };

      let products = this.utilsSvc.getFromLocalStorage('products') || []; // Obtener los productos del almacenamiento local o crear un nuevo array si no existen
      products.push(productWithProvisionalId); // Agregar el formulario al array de productos
      this.utilsSvc.saveInLocalStorage('products', products); // Guardar los productos actualizados en el almacenamiento local

      this.utilsSvc.dismissModal({ succes: true });

      this.utilsSvc.presentToast({
        message: 'Patient added assyncly',
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: "checkmark-circle-outline"
      })
      loading.dismiss();
    }

  }

  async updateProduct() {
    const loading = await this.utilsSvc.loading();
    await loading.present();
    if (this.isConnected) {
      let path = `users/${this.user.uid}/patients/${this.product.id}`;



      //subir imagen y botener la url si cambio la imagen
      if (this.form.value.image !== this.product.image) {
        let dataUrl = this.form.value.image;
        let imagePath = `${this.user.uid}/${this.product.id}/${Date.now()}`;
        if (this.product.URLim) {
          imagePath = await this.firebaseSvc.getFilePath(this.product.URLim);
        }
        let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);
        this.form.controls.URLim.setValue(imageUrl);
      }


      delete this.form.value.id;

      this.firebaseSvc.updateDocument(path, this.form.value).then(async res => {

        this.utilsSvc.dismissModal({ succes: true });

        this.utilsSvc.presentToast({
          message: 'Updated patient information',
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
      let products = this.utilsSvc.getFromLocalStorage('products') || []; // Obtener los productos del almacenamiento local o crear un nuevo array si no existen
      let updatedProducts = products.map(product => {
        if (product.id === this.product.id) {
          // Actualizar los campos del producto actual con los valores del formulario
          product = { ...product, ...this.form.value };
        }
        return product;
      });
      this.utilsSvc.saveInLocalStorage('products', updatedProducts); // Guardar los productos actualizados en el almacenamiento local

      this.utilsSvc.dismissModal({ success: true });
      this.utilsSvc.presentToast({
        message: 'Updated patient information assyncly',
        duration: 1500,
        color: 'success',
        position: 'middle',
        icon: "checkmark-circle-outline"
      });
      loading.dismiss();
    }
  }

}
