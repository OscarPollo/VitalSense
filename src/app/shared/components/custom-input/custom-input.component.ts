import { Component,Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-custom-input',
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
})
export class CustomInputComponent  implements OnInit {

  @Input() control!: FormControl;
  @Input() type!:string;
  @Input() label!:string;
  @Input() autocomplete!:string;
  @Input() icon!:string;
  @Input() placeholder!:string;  
  
  isPassword!:boolean;
  hide:boolean=true;
  genderOptions: string[] = ['Male', 'Female', 'Other']; // Definición de opciones de género
  
  constructor() { }

  ngOnInit() {
    if (this.type =="password") this.isPassword=true;
    else this.isPassword=false;
  }

  showOrHidePassword(){
    this.hide=!this.hide;
    if (this.hide)this.type="password";
    else this.type="text";
  }
}
