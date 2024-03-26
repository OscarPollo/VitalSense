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

  form = new FormGroup({
    id: new FormControl(''),
    name: new FormControl("", [Validators.required]),
    age: new FormControl(null, [Validators.required, Validators.min(0)]), // Se agrega validación para que la edad sea un número mayor o igual a cero
    gender: new FormControl('', [Validators.required]),
    phoneNumber: new FormControl(null, [Validators.required, Validators.pattern(/^\d{10}$/)]), // Se agrega validación para que el número de teléfono tenga 10 dígitos
    observation: new FormControl('', [Validators.required]),
    image: new FormControl('')
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
    const dataUrl = (await this.utilsSvc.takePicture("Patient photo")).dataUrl;
    this.form.controls.image.setValue(dataUrl);
  }

  submit() {
    if (this.form.valid) {
      if (this.product) this.updateProduct();
      else this.createProduct();
    }
  }

  //Convierte string a numeros
  setNumberInputs() {
    let { age, phoneNumber } = this.form.controls;
    if(age.value) age.setValue(parseFloat(age.value))
    if(phoneNumber.value) phoneNumber.setValue(parseFloat(phoneNumber.value))
  }

  async createProduct() {

    let path = `users/${this.user.uid}/patients`;

    const loading = await this.utilsSvc.loading();
    await loading.present();  

    delete this.form.value.id;

    this.firebaseSvc.addDocument(path, this.form.value).then(async res => {

      //subir imagen y botener la url
      let dataUrl = this.form.value.image;
      if(dataUrl){
        let imagePath = `${this.user.uid}/${res.id}/${Date.now()}`;
        let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

        path=`users/${this.user.uid}/patients/${res.id}`
        await this.firebaseSvc.updateDocument(path, {image: imageUrl});
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

  }

  async updateProduct() {

    let path = `users/${this.user.uid}/patients/${this.product.id}`;

    const loading = await this.utilsSvc.loading();
    await loading.present();

    //subir imagen y botener la url si cambio la imagen
    if (this.form.value.image !== this.product.image) {
      let dataUrl = this.form.value.image;
      let imagePath = `${this.user.uid}/${this.product.id}/${Date.now()}`;
      if(this.product.image){
        imagePath = await this.firebaseSvc.getFilePath(this.product.image);
      }
      let imageUrl = await this.firebaseSvc.uploadImage(imagePath, dataUrl);
      this.form.controls.image.setValue(imageUrl);
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
  }

}
