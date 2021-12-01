import { AfterViewInit, Component, NgZone, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { BadgeService } from 'src/badge.service';
declare const ui: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})

export class AppComponent implements AfterViewInit, OnInit {
  title = 'footsteps';

  public tabId!: number;
  public tabHostname?: string;

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
      // const initiatorHost = hostnameFromStringURL(request.initiator);
      // if (initiatorHost && initiatorHost !== this.tabHostname) //TODO: list domain firing requets when they are not the current tab domain
      const destDomain = hostnameFromStringURL(request.url) ?? '__error_invalid_url__';
      if (destDomain === this.tabHostname) return acc; // ignore request if to domain of the tab
      return (acc[destDomain] = ++acc[destDomain] || 1, acc);
    }, {})),
  );

  constructor (
    private ngZone: NgZone,
  ) {}

  public ngAfterViewInit(): void {
    ui();
  }

  public async ngOnInit () {
    BadgeService.setUpBadgeNumber(5);

    const tab = await getTab();

    this.tabId = tab.id ?? -1;
    this.tabHostname = hostnameFromStringURL(tab.url ?? tab.pendingUrl);
    this.tabs_latest_request_array$.next({});

    chrome.storage.onChanged.addListener((changes, area) => {
      //get changes on local storages and use if tabs_latest_request_array was updated
      if (area === 'local' && changes.tabs_latest_request_array?.newValue) {
        this.ngZone.run(() => { //ngZone to run it in angular zone so it sees cahnges
          this.tabs_latest_request_array$.next(changes.tabs_latest_request_array.newValue);
        })
      }
    });
    chrome.tabs.onUpdated.addListener((tabId, infos, tab) => {
      if (tabId !== this.tabId) return;
      this.ngZone.run(() => {
        this.tabHostname = hostnameFromStringURL(tab.url ?? tab.pendingUrl);
      });
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

function hostnameFromStringURL (stringUrl: any): string | undefined {
  let hostname;
  try {
    hostname = new URL(stringUrl).hostname;
  } catch (_) {}
  return hostname;
}
