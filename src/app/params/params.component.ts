import { Component } from '@angular/core';

@Component({
  selector: 'app-params',
  templateUrl: './params.component.html',
  styleUrls: [ './params.component.css' ]
})

export class ParamsComponent {



  public displayPeriod (): void {
    var inputValue: number = Number((<HTMLInputElement>document.getElementById("period")).value);
    chrome.storage.local.set({ key: inputValue });
  }
  public getKeepAlive (): any {
    let result = { key: 30 };
    let res: any;
    chrome.storage.local.get([ 'key' ], (res) => {
      result.key = res.key;

    });
    return result.key;
  }
}
