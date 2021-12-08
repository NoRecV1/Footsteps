import { Component } from '@angular/core';

declare const ui: any;

@Component({
  selector: 'app-params',
  templateUrl: './params.component.html',
  styleUrls: [ './params.component.css' ]
})

export class ParamsComponent {



  public keepAliveTime:number=30;
  public SetKeepAliveTime (): void {
    var inputValue: number = Number((<HTMLInputElement>document.getElementById("period")).value);
    chrome.storage.local.set({ keepAliveTime_key: inputValue });
    ui('.toast');
  }
  public async ngOnInit () {
    this.keepAliveTime = await keepAliveTimePromise();
    //console.log("here"); console.log(this.keep);

  }

}
function keepAliveTimePromise(): Promise<any> {
  return new Promise((resolve, reject) => {
    try{
    chrome.storage.local.get(['keepAliveTime_key'], (result)=>{
        resolve(result.keepAliveTime_key);
    });
  } catch (e) {
      reject(e);
    }
  });

}