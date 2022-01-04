import { methodsToKeep, hostFromUrl, uri_to_collected_data } from "./app/utils";
import { BadgeService } from "./badge.service";

let keepAliveTime:number = 30;
chrome.storage.local.set({keepAliveTime_key: keepAliveTime});
// time in latest arrays in seconds

// let request_array: chrome.webRequest.WebRequestBodyDetails[] = [];
let requestsArrayByTabId: { [key: number]: chrome.webRequest.WebRequestBodyDetails[]} = {};

const setupVariables = () => chrome.storage.local.get(['requestsArrayByTabId'], ({requestsArrayByTabId}) => {
  chrome.storage.local.set({
    requestsArrayByTabId: requestsArrayByTabId ?? {},
  });
});

// set up default values
chrome.windows.onCreated.addListener(setupVariables);
chrome.runtime.onInstalled.addListener(setupVariables);
chrome.tabs.onCreated.addListener((tab) => {
  // initialise requests array the new tab
  if (tab.id) requestsArrayByTabId[tab.id] = [];
});

chrome.webRequest.onBeforeRequest.addListener(
  // handle http request
  (details: chrome.webRequest.WebRequestBodyDetails) => {
    //remove calls from chrome extension
    if (details.initiator?.startsWith('chrome-extension://')) return;
    // filter http requests by method
    if (!methodsToKeep.includes(details.method)) return;
    // filter by request url to keep only relevent ones
    if(!Object.keys(uri_to_collected_data).includes(hostFromUrl(details.url) ?? '')) return;
    
    requestsArrayByTabId[details.tabId] = (requestsArrayByTabId[details.tabId] ?? []).concat(details);

    let requestsCount = requestsArrayByTabId[details.tabId].length;
    BadgeService.setBadgeNumber(requestsCount, details.tabId);

    chrome.storage.local.set({
      requestsArrayByTabId,
    });

    //remove requests from list after keepAliveTime passed
    chrome.storage.local.get(['keepAliveTime_key'], function(result:any) {
      keepAliveTime = (result.keepAliveTime_key);
    });
    setTimeout(() => {
      // requestsArrayByTabId[details.tabId] = (requestsArrayByTabId[details.tabId] ?? []).slice(1);

      // (DEL) no need to check if array is initialised each time since it's done when onCreated event is fired 
      // (DEL) shift is faster than slice to delete the first item of an array

      requestsArrayByTabId[details.tabId].shift();

      let requestsCount = requestsArrayByTabId[details.tabId].length;
      BadgeService.setBadgeNumber(requestsCount, details.tabId);

      chrome.storage.local.set({
        requestsArrayByTabId,
      });
    }, keepAliveTime * 1000);
  },
  { urls: [ "http://*/*", "https://*/*" ] }
);
