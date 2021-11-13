import { Component, OnInit } from '@angular/core';
import { ReplaySubject, Observable, Subject, interval, combineLatest, Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map, pairwise, scan, tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent implements OnInit {
  title = 'footsteps';
  stalkers = [ 'facebook.com', 'instagram.com' ]

  private refreshRate = 500; // in ms
  private displayTime = 5 * 1000;

  public tabId?: number;

  private subscriptions: Subscription[] = [];

  private refresh$ = interval(this.refreshRate);
  // private deleteOldestRequest$ = new BehaviorSubject(0);

  public allRequest$: Subject<chrome.webRequest.WebRequestBodyDetails> = new ReplaySubject();
  public tabRequest$: Observable<chrome.webRequest.WebRequestBodyDetails> = this.allRequest$.pipe(
    filter((details, i) => details.tabId === this.tabId),
  );
  public latestRequestArray$: Observable<chrome.webRequest.WebRequestBodyDetails[]> = combineLatest(
    [
      this.tabRequest$,
      this.refresh$,
    ]
  ).pipe(
    // filter(([_, details]) => details.timeStamp < Date.now() + this.displayTime ),
    // map(([_, details]) => details),
    pairwise(),
    map(([[previousRequest, previousRefresh], [currentRequest, currentRefresh]]) => (
      previousRefresh === currentRefresh ? currentRequest : undefined
    )),
    scan((list: chrome.webRequest.WebRequestBodyDetails[], newRequest): chrome.webRequest.WebRequestBodyDetails[] => {
      return list.filter((requestDetails)=> Date.now() < requestDetails.timeStamp + this.displayTime).concat(newRequest ?? []);
    },[]),
    distinctUntilChanged((prev, curr) => prev.length === curr.length),
    tap(console.log),
  );

  // public dynamicLatestRequestArray$: Observable<chrome.webRequest.WebRequestBodyDetails[]> = combineLatest(
  //   [
  //     this.tabRequest$.pipe(startWith({} as chrome.webRequest.WebRequestBodyDetails)), // for the first pairwise to work
  //     this.deleteOldestRequest$,//.pipe(startWith(0)),
  //   ]
  // ).pipe(
  //   pairwise(), //take last values to compare
  //   map(([[previousRequest, previousRefresh], [currentRequest, currentRefresh]]) => (
  //     //map to new request if new request, else to undefined if just asking for deletion
  //     previousRefresh === currentRefresh ? currentRequest : undefined
  //   )),
  //   tap((request) => request && setTimeout(() => this.deleteOldestRequest$.next(this.deleteOldestRequest$.value + 1), this.displayTime) ),
  //   scan((list: chrome.webRequest.WebRequestBodyDetails[], newRequest): chrome.webRequest.WebRequestBodyDetails[] => {
  //     return newRequest ? list.concat(newRequest) : list.slice(1);
  //   },[]),
  //   // distinctUntilChanged((prev, curr) => prev.length === curr.length),
  //   tap(console.log),
  // );

  // public requestArray$ : Observable<chrome.webRequest.WebRequestBodyDetails[]> = this.tabRequest$.pipe(
  //   //make an array which accumulates requests in it
  //   scan((list: chrome.webRequest.WebRequestBodyDetails[], newRequest): chrome.webRequest.WebRequestBodyDetails[] => {
  //     return [
  //       ...list.filter((requestDetails)=> Date.now() < requestDetails.timeStamp + this.displayTime),
  //       newRequest];
  //   },[]),
  //   // map((requests) => requests.filter(
  //   //   (requestDetails) => Date.now() < requestDetails.timeStamp + this.displayTime
  //   // )),
  //   // switchMap((requests) => {
  //   //   const array$ = new ReplaySubject<chrome.webRequest.WebRequestBodyDetails[]>();
  //   //   array$.next(requests);
  //   //   const subs = array$.pipe(
  //   //     // filter((array) => array.length > 0),
  //   //     delayWhen((array) => timer(this.displayTime - (Date.now() - array[0]?.timeStamp))),
  //   //     tap((array) => {
  //   //       array.shift();
  //   //       return array$.next(array);
  //   //     }),
  //   //   ).subscribe((array) => {
  //   //     if (array.length < 1) subs.unsubscribe();
  //   //   });
  //   //   return array$;
  //   // }),
  //   // map((requests) => {
  //   //   setTimeout(() => requests.shift(), this.displayTime);
  //   //   return requests;
  //   // }),
  //     // requests.filter(
  //     //   (requestDetails) => Date.now() < requestDetails.timeStamp + this.displayTime
  //     // )
  //   // switchMap(() => this.refresh$.pipe())
  //   tap(console.log),
  //   // startWith([]),
  //   // tap((list) => list.filter((requestDetails) => requestDetails.timeStamp < Date.now() + this.displayTime )),
  // );
  // // public recentRequestArray$: Observable<chrome.webRequest.WebRequestBodyDetails[]> = combineLatest()


  public async ngOnInit () {
    this.tabId = (await getTab()).id;
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'before_request':
          this.allRequest$.next(message.data);
          break;
      }
    });
    // chrome.tabs.query({ active: true, currentWindow: true }, ([ tab ]) => {
    //   console.log('TAB id :', tab.id);
    //   this.tabId = tab.id;
    // })
    // setTimeout(() => console.log('Tab id after 1secs', this.tabId), 1000);
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
