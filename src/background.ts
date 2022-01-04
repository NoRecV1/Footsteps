import { methodsToKeep, hostFromUrl, url_to_collected_data } from "./app/utils";
import { BadgeService } from "./badge.service";

let keepAliveTime:number = 30;
chrome.storage.local.set({keepAliveTime_key: keepAliveTime});
// time in latest arrays in seconds

// let request_array: chrome.webRequest.WebRequestBodyDetails[] = [];
let latest_requests: { [key: number]: chrome.webRequest.WebRequestBodyDetails[]} = {};

const setupVariables = () => chrome.storage.local.get(['latest_requests'], ({latest_requests}) => {
  chrome.storage.local.set({
    latest_requests: latest_requests ?? {},
  });
});

// set up default values
chrome.windows.onCreated.addListener(setupVariables);
chrome.runtime.onInstalled.addListener(setupVariables);
chrome.tabs.onCreated.addListener((tab) => {
  // initialise requests array the new tab
  if (tab.id) latest_requests[tab.id] = [];
});

chrome.webRequest.onBeforeRequest.addListener(
  // handle http request
  (details: chrome.webRequest.WebRequestBodyDetails) => {
    //remove calls from chrome extension
    if (details.initiator?.startsWith('chrome-extension://')) return;
    // filter http requests by method
    if (!methodsToKeep.includes(details.method)) return;
    // filter by request url to keep only relevent ones
    if(!Object.keys(url_to_collected_data).includes(hostFromUrl(details.url) ?? '')) return;

    latest_requests[details.tabId] = (latest_requests[details.tabId] ?? []).concat(details);

    let requestsCount = latest_requests[details.tabId].length;
    BadgeService.setBadgeNumber(requestsCount, details.tabId);

    chrome.storage.local.set({
      latest_requests,
    });

    //remove requests from list after keepAliveTime passed
    chrome.storage.local.get(['keepAliveTime_key'], function(result:any) {
      keepAliveTime = (result.keepAliveTime_key);
    });
    setTimeout(() => {
      // latest_requests[details.tabId] = (latest_requests[details.tabId] ?? []).slice(1);

      // (DEL) no need to check if array is initialised each time since it's done when onCreated event is fired
      // (DEL) shift is faster than slice to delete the first item of an array

      latest_requests[details.tabId].shift();

      let requestsCount = latest_requests[details.tabId].length;
      BadgeService.setBadgeNumber(requestsCount, details.tabId);

      chrome.storage.local.set({
        latest_requests,
      });
    }, keepAliveTime * 1000);
  },
  { urls: [ "http://*/*", "https://*/*" ] }
);
