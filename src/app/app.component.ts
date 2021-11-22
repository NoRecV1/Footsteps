import {AfterViewInit, Component } from '@angular/core';
declare const ui: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit{

  constructor() {}

  ngAfterViewInit(): void {
    ui();
  }

  title = 'footsteps';
  stalkers = ['facebook.com', 'instagram.com']
}
