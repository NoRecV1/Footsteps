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
  private domain_to_data: {[key: string]: string} = {'google.com': 'localisation', 'facebook.com': 'tracking publicitaire', 'instagram.com': 'comportement utilisateur',
      'hubvisor.io': 'tracking publicitaire', 'criteo.com': 'localisation', '4dex.io': 'adresse IP', 'adnxs.com': 'tracking publicitaire', 'adnxs-simple.com': 'tracking publicitaire'};

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

    // AON TODO Utiliser un objet pour stocker la data collectée et le nombre de requêtes
    map((requests) => requests.reduce((acc: {[key: string] : {data: string, count: number}}, request) => {
      // const initiatorHost = domainFromUrl(request.initiator);
      // if (initiatorHost && initiatorHost !== this.tabHostname) //TODO: list domain firing requets when they are not the current tab domain
      const destDomain = domainFromUrl(request.url) ?? '__error_invalid_url__';
      if (destDomain === this.tabHostname) return acc; // ignore request if to domain of the tab

      // if(this.domain_to_data[destDomain] !== undefined){
      //console.log(this.domain_to_data[destDomain])
      //console.log(++(acc[destDomain][1]) || 1)
      return (acc[destDomain] = {data: this.domain_to_data[destDomain] || '', count: acc[destDomain]?.count ? ++(acc[destDomain].count) : 1}, acc)
      // }
      // console.log('Unknown data')
      // console.log(++acc[destDomain][1])
      // return (acc[destDomain] = ['', ++acc[destDomain][1] || 1], acc)
    }, {})),

    // map((requests) => requests.reduce((match: {[key: string] : string}, request) =>{
    //   // AON Modifier par la suite pour considérer des requêtes fines, pas uniquement le domaine global
    //   const destDomain = domainFromUrl(request.url) ?? '__error_invalid_url__';
    //   if(this.domain_to_data[destDomain] !== undefined){
    //     return (match[destDomain] = this.domain_to_data[destDomain], match)
    //   }
    //   return 1
    // }, {})),
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
