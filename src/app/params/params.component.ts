import { Component } from '@angular/core';

declare const ui: any;

@Component({
  selector: 'app-params',
  templateUrl: './params.component.html',
  styleUrls: [ './params.component.css' ]
})

export class ParamsComponent {



  public keep:number=31;
  public displayPeriod (): void {
    var inputValue: number = Number((<HTMLInputElement>document.getElementById("period")).value);
    chrome.storage.local.set({ key: inputValue });
    ui('.toast');
  }
  public async ngOnInit () {
    this.keep = await keepAlivePromise();
    //console.log("here"); console.log(this.keep);

  }

}
function keepAlivePromise(): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['key'], (res)=>{
        resolve(res.key);
    });

  });

}