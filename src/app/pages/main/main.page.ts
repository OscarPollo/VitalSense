import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit {

  pages = [
    { title: 'Home', url: '/main/home', icon: 'home' },
    { title: 'Profile', url: '/main/profile', icon: 'person' },
  ]

  router = inject(Router);
  currentPath: string = '';
  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  ngOnInit() {
    this.router.events.subscribe((event: any) => {
      if (event?.url) {
        this.currentPath = event.url;
      }
    })
  }
  signOut() {
    this.firebaseSvc.signOut();
  }
  //REGRESAR LOS DATOS DEL USUARIO
  user(): User {
    return this.utilsSvc.getFromLocalStorage('user');
  }
}
