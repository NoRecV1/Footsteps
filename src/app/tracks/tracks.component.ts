import { Component, NgZone, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { hostFromUrl, domainFromUrl, getTab, localStorageGet, url_to_collected_data, collected_data_naming } from '../utils';

@Component({
  selector: 'app-tracks',
  templateUrl: './tracks.component.html',
  styleUrls: [ './tracks.component.css' ]
})

export class TracksComponent implements OnInit {
  public tab_id!: number;
  public tab_hostname?: string;

  public latest_requests$: ReplaySubject<{ [key: number]: chrome.webRequest.WebRequestBodyDetails[] }> = new ReplaySubject();

  // AON
  // Builds the list of stalker domains with number of requests sent and collected data from the raw array
  // of recent requests collected in the background
  public stalkers$ = this.latest_requests$.pipe(
    // Only consider requests from this tab
    map((requests) => requests[this.tab_id] ?? []),
    // Only emit when changes occur
    distinctUntilChanged((previous_requests: chrome.webRequest.WebRequestBodyDetails[], latest_requests: chrome.webRequest.WebRequestBodyDetails[]) => (
      previous_requests.length === latest_requests.length
    )),

    // Map each domain to the data it collects (data) and the number of requests it emitted (count)
    map((requests) => requests.reduce((acc: {[key: string] : {data: string[], count: number}}, request) => {

      let dest_domain = domainFromUrl(request.url) ?? '__error_invalid_url__';

      // AON
      // Specific grouping of known domains belonging to google
      if(dest_domain === 'googleadservices.com' || dest_domain === 'google-analytics.com' || dest_domain === 'doubleclick.net'){
        dest_domain = 'google.com';
      }

      /**
       * AON Matches the domain to the information it collects
       */
      // These two prints allow you to very simply add new entries to url_to_collected_data
      console.log(request.url);
      console.log(hostFromUrl(request.url));

      let collected_by_domain = acc[dest_domain]?.data; // Data already collected by the same domain
      let match = hostFromUrl(request.url) ?? '__error_invalid_url__'; // Url to look for in url_to_collected_data

      // Specific match for all akstat.io domains due to their unique strategy to defeat our matching process
      if(match.includes('akstat.io')){
        match = 'akstat.io';
      }

      let category = url_to_collected_data[match]; // Reference of data collected by this url (if known)
      let collected_by_request = null; // Will contain the name of the category of data collected by this specific request (location, behavior...)

      if(category) // Did it match any known url?
        collected_by_request = collected_data_naming[category];

      if(collected_by_domain){ // Let's add the new entry to the data field for this domain
        if(collected_by_request){
          if(!collected_by_domain.includes(collected_by_request)){ // Only one occurence of each category, we don't want duplicates
            collected_by_domain.push(collected_by_request);
          }
        }
      }else{ // Let's create an array for the data field of this domain
        if(collected_by_request){
          collected_by_domain = [collected_by_request];
        }else{
          collected_by_domain = [];
        }
      }
      // We now have one more request for this domain and a potential match for collected data
      return (acc[dest_domain] = {data: collected_by_domain, count: acc[dest_domain]?.count ? ++(acc[dest_domain].count) : 1}, acc)
    }, {})),

    // We only want to keep information about domains we know are collecting data
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

    this.tab_id = tab.id ?? -1;
    this.tab_hostname = domainFromUrl(tab.url ?? tab.pendingUrl);

    // init observable with current value of local storage
    this.latest_requests$.next((await localStorageGet(['latest_requests'])).latest_requests ?? {});

    chrome.storage.onChanged.addListener((changes, area) => {
      //get changes on local storage and use if latest_request was updated
      if (area === 'local' && changes.latest_requests?.newValue) {
        this.ngZone.run(() => { //ngZone to run it in angular zone so it sees changes
          this.latest_requests$.next(changes.latest_requests.newValue);
        })
      }
    });
    chrome.tabs.onUpdated.addListener((tab_id, infos, tab) => {
      if (tab_id !== this.tab_id) return;
      this.ngZone.run(() => {
        this.tab_hostname = domainFromUrl(tab.url ?? tab.pendingUrl);
      });
    });
  }
}
