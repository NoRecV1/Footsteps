import { Component, NgZone, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent implements OnInit {
  title = 'footsteps';

  public tabId!: number;

  public tabs_latest_request_array$: ReplaySubject<{ [key: number]: chrome.webRequest.WebRequestBodyDetails[] }> = new ReplaySubject();
  public latestRequests$ = this.tabs_latest_request_array$.pipe(
    //take only requests from this tab
    map((tabs_latest_request_array) => tabs_latest_request_array[this.tabId] ?? []),
    //only emit changes in this tab
    distinctUntilChanged((previousRequests: chrome.webRequest.WebRequestBodyDetails[], currentRequests: chrome.webRequest.WebRequestBodyDetails[]) => (
      previousRequests.length === currentRequests.length
    )),
  );

  public domainRequestCount$ = this.latestRequests$.pipe(
    //map list of request to object associating domain (key) to number of requests (value)
    map((requests) => requests.reduce((acc: {[key: string] : number}, request) => {
      // const initiator = request.initiator ?? '__unknown__';
      const domain = new URL(request.url).hostname;
      // if (initiator === '__unknown__') console.log('Unknown initiator : ', request);
      return (acc[domain] = ++acc[domain] || 1, acc);
    }, {})),
  );

  constructor (
    private ngZone: NgZone,
  ) {}

  public async ngOnInit () {
    this.tabId = (await getTab()).id ?? -1;
    this.tabs_latest_request_array$.next({});
    chrome.storage.onChanged.addListener((changes, area) => {
      //get changes on local storages and use if tabs_latest_request_array was updated
      if (area === 'local' && changes.tabs_latest_request_array?.newValue) {
        this.ngZone.run(() => { //ngZone to run it in angular zone so it sees cahnges
          this.tabs_latest_request_array$.next(changes.tabs_latest_request_array.newValue);
        })
      }
    });
  }
}

function getTab (): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        function (tabs) {
          resolve(tabs[ 0 ]);
        }
      )
    } catch (e) {
      reject(e);
    }
  })
}
