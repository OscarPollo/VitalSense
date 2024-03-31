import { Component, Input, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Product } from 'src/app/models/product.model';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  ngOnInit() {
  }

  //REGRESAR LOS DATOS DEL USUARIO
  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }
  //TOMAR/SELECCIONAR UNA FOTO
  async takeImage() {
    let user=this.user();
    let path = `users/${user.uid}`;
    
    const dataUrl = (await this.utilsSvc.takePicture("User photo"));
    const loading = await this.utilsSvc.loading();
    await loading.present();

    let imagePath = `${user.uid}/profile`;
    user.image = await this.firebaseSvc.uploadImage(imagePath, dataUrl);

    this.firebaseSvc.updateDocument(path, {image:user.image}).then(async res => {

      this.utilsSvc.saveInLocalStorage('user', user);

      this.utilsSvc.presentToast({
        message: 'Updated user photo',
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
