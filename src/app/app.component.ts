import { AfterViewInit, Component, NgZone, OnInit } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { BadgeService } from 'src/badge.service';
import { fromUrl, parseDomain, ParseResult, ParseResultType } from 'parse-domain';
import { toUnicode } from 'punycode';
declare const ui: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})

export class AppComponent implements AfterViewInit, OnInit {
  title = 'footsteps';

  public methodsToKeep: string[] = [
    'POST',
    'PUT',
    'CONNECT',
    'TRACE',
    'PATCH',
  ];

  public tabId!: number;
  public tabHostname?: string;
  //public keepAliveTime:number;
  public tabs_latest_request_array$: ReplaySubject<{ [key: number]: chrome.webRequest.WebRequestBodyDetails[] }> = new ReplaySubject();
  public latestRequests$ = this.tabs_latest_request_array$.pipe(
    //take only requests from this tab
    map((tabs_latest_request_array) => tabs_latest_request_array[this.tabId] ?? []),
    //only emit changes in this tab
    distinctUntilChanged((previousRequests: chrome.webRequest.WebRequestBodyDetails[], currentRequests: chrome.webRequest.WebRequestBodyDetails[]) => (
      previousRequests.length === currentRequests.length
    )),
    map((requestArray) => requestArray.filter((request) => this.methodsToKeep.includes(request.method))),
  );

  public domainRequestCount$ = this.latestRequests$.pipe(
    //map list of request to object associating domain (key) to number of requests (value)
    map((requests) => requests.reduce((acc: {[key: string] : number}, request) => {
      // const initiatorHost = domainFromUrl(request.initiator);
      // if (initiatorHost && initiatorHost !== this.tabHostname) //TODO: list domain firing requets when they are not the current tab domain
      const destDomain = domainFromUrl(request.url) ?? '__error_invalid_url__';
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
    this.tabHostname = domainFromUrl(tab.url ?? tab.pendingUrl);
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
        this.tabHostname = domainFromUrl(tab.url ?? tab.pendingUrl);
      });
    });
  }

  public displayPeriod(): void{ 
    var inputValue:number = Number((<HTMLInputElement>document.getElementById("period")).value);
    chrome.storage.local.set({key: inputValue});
  }
  public getKeepAlive(): any{
    let result={key:10};
    let res:any;
    chrome.storage.local.get(['key'], (res)=>{
        result.key=res.key;

    });
    console.log(result);
    return result.key;
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

function domainFromUrl (url: string | undefined): string | undefined {
  if (!url) return undefined;
  const parseResult: ParseResult = parseDomain(
    fromUrl(url),
  );
  if (parseResult.type === ParseResultType.Listed) {
    const { subDomains, domain, topLevelDomains } = parseResult;
    return toUnicode(`${domain}.${topLevelDomains.join('.')}`);
  }
  return undefined;
}
