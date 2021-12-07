import { Component, NgZone, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { domainFromUrl, getTab, localStorageGet } from '../utils';

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: [ './tracks.component.css' ]
})

export class TracksComponent implements OnInit {
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
      // const initiatorHost = domainFromUrl(request.initiator);
      // if (initiatorHost && initiatorHost !== this.tabHostname) //TODO: list domain firing requets when they are not the current tab domain
      const destDomain = domainFromUrl(request.url) ?? '__error_invalid_url__';
      return (acc[destDomain] = ++acc[destDomain] || 1, acc);
    }, {})),
  );

  constructor (
    private ngZone: NgZone,
  ) {}

  public async ngOnInit () {
    const tab = await getTab();

    this.tabId = tab.id ?? -1;
    this.tabHostname = domainFromUrl(tab.url ?? tab.pendingUrl);

    // init observable with current value of local storage
    this.tabs_latest_request_array$.next((await localStorageGet(['tabs_latest_request_array'])).tabs_latest_request_array ?? {});

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
        this.tabHostname = domainFromUrl(tab.url ?? tab.pendingUrl);
      });
    });
  }
}
