import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ReplaySubject, Observable, Subject, interval, combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, pairwise, scan, tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent implements OnInit {
  title = 'footsteps';
  // stalkers = [ 'facebook.com', 'instagram.com' ]

  public tabId!: number;

  // private refresh$ = interval(this.refreshRate);
  // // private deleteOldestRequest$ = new BehaviorSubject(0);

  // public allRequest$: Subject<chrome.webRequest.WebRequestBodyDetails> = new ReplaySubject();
  // public tabRequest$: Observable<chrome.webRequest.WebRequestBodyDetails> = this.allRequest$.pipe(
  //   filter((details, i) => details.tabId === this.tabId),
  // );
  // public latestRequestArray$: Observable<chrome.webRequest.WebRequestBodyDetails[]> = combineLatest(
  //   [
  //     this.tabRequest$,
  //     this.refresh$,
  //   ]
  // ).pipe(
  //   // filter(([_, details]) => details.timeStamp < Date.now() + this.displayTime ),
  //   // map(([_, details]) => details),
  //   pairwise(),
  //   map(([[previousRequest, previousRefresh], [currentRequest, currentRefresh]]) => (
  //     previousRefresh === currentRefresh ? currentRequest : undefined
  //   )),
  //   scan((list: chrome.webRequest.WebRequestBodyDetails[], newRequest): chrome.webRequest.WebRequestBodyDetails[] => {
  //     return list.filter((requestDetails)=> Date.now() < requestDetails.timeStamp + this.displayTime).concat(newRequest ?? []);
  //   },[]),
  //   distinctUntilChanged((prev, curr) => prev.length === curr.length),
  //   tap(console.log),
  // );

  public tabReqArray: chrome.webRequest.WebRequestBodyDetails[] = [];

  constructor (private cRef: ChangeDetectorRef) {}

  public async ngOnInit () {
    this.tabId = (await getTab()).id ?? -1;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.tabs_latest_request_array?.newValue) {
        const incomingTabReqArray: chrome.webRequest.WebRequestBodyDetails[] = changes.tabs_latest_request_array.newValue[this.tabId];
        if (this.tabReqArray.length !== incomingTabReqArray.length) {
          this.tabReqArray = [ ...incomingTabReqArray];
          this.cRef.detectChanges();
          console.log('LatestRequests : ', incomingTabReqArray);
        }
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
