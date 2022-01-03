import { Component, NgZone, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { hostFromUrl, domainFromUrl, getTab, localStorageGet, uri_to_collected_data } from '../utils';

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: [ './tracks.component.css' ]
})

export class TracksComponent implements OnInit {
  public tabId!: number;
  public tabHostname?: string;

  public tabs_latest_request_array$: ReplaySubject<{ [key: number]: chrome.webRequest.WebRequestBodyDetails[] }> = new ReplaySubject();

  private collected_data_naming: {[key: number]: string} = {1: 'Pages consultées', 2: 'Suivi publicitaire', 3: 'Comportement utilisateur',
    4: 'Localisation'}


  private latestRequests$ = this.tabs_latest_request_array$.pipe(
    //take only requests from this tab
    map((tabs_latest_request_array) => tabs_latest_request_array[this.tabId] ?? []),
    //only emit changes in this tab
    distinctUntilChanged((previousRequests: chrome.webRequest.WebRequestBodyDetails[], currentRequests: chrome.webRequest.WebRequestBodyDetails[]) => (
      previousRequests.length === currentRequests.length
    )),
  );

  public domainRequestCount$ = this.latestRequests$.pipe(
    //map list of request to object associating domain (key) to collected data and number of requests (value)
    map((requests) => requests.reduce((acc: {[key: string] : {data: string[], count: number}}, request) => {

      // const initiatorHost = domainFromUrl(request.initiator);
      // if (initiatorHost && initiatorHost !== this.tabHostname) //TODO: list domain firing requets when they are not the current tab domain
      let destDomain = domainFromUrl(request.url) ?? '__error_invalid_url__';
      // if (destDomain === this.tabHostname) return acc; // ignore request if to domain of the tab

      // AON TODO : Match alternative domains to main domain. Example below
      if(destDomain === 'googleadservices.com' || destDomain === 'google-analytics.com' || destDomain === 'doubleclick.net'){
        destDomain = 'google.com';
      }

      // AON Matches the domain to every information it collects
      // TODO : Improve this trivial behavior (add matches, check if one of the known subdomains is part of the request for instance)

      console.log(request.url);
      console.log(hostFromUrl(request.url));
      let collected_by_domain = acc[destDomain]?.data;
      let match = hostFromUrl(request.url) ?? '__error_invalid_url__';

      if(match.includes('akstat.io')){
        match = 'akstat.io';
      }

      let category = uri_to_collected_data[match];
      let collected_by_request = null;
      if(category)
        collected_by_request = this.collected_data_naming[category];

      if(collected_by_domain){
        if(collected_by_request){
          if(!collected_by_domain.includes(collected_by_request)){
            collected_by_domain.push(collected_by_request);
          }
        }
      }else{
        if(collected_by_request){
          collected_by_domain = [collected_by_request];
        }else{
          collected_by_domain = [];
        }
      }

      return (acc[destDomain] = {data: collected_by_domain, count: acc[destDomain]?.count ? ++(acc[destDomain].count) : 1}, acc)
    }, {})),
  );

  // AON Only keep those we know are collecting data
  public stalkers$ = this.domainRequestCount$.pipe(
    map((domains) => {
      const filtered = {...domains};
      for(const domain in domains){
        if(domains[domain].data.length <= 0){
          delete filtered[domain];
        }
      }

      return filtered;
    }),
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
