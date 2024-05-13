import { Component, OnInit, inject } from '@angular/core';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.scss'],
})
export class TutorialComponent  implements OnInit {

  image: String = "";
  i:number = 0;
  utilsSvc = inject(UtilsService);

  ngOnInit() {
    this.showImg("assets/icon/1.png");
    this.i=1;
  }

  showImg(imgPath: String){
    this.image=imgPath;
  }
  nextImg(){
    if(this.i<9){
    this.i+=1;
    this.showImg(`assets/icon/${this.i}.png`);
    }else {
      this.utilsSvc.dismissModal({ succes: true });
    }
    
  }
}
