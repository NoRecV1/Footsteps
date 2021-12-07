import { methodsToKeep } from "./app/utils";
import { BadgeService } from "./badge.service";

let keepAliveTime:number=30;
chrome.storage.local.set({key: keepAliveTime});
// time in latest arrays in seconds

let request_array: chrome.webRequest.WebRequestBodyDetails[] = [];
let tabs_latest_request_array: { [key: number]: chrome.webRequest.WebRequestBodyDetails[]} = {};

const setupVariables = () => chrome.storage.local.get(['request_array', 'tabs_latest_request_array'], ({request_array, tabs_latest_request_array}) => {
  chrome.storage.local.set({
    request_array: request_array ?? [],
    tabs_latest_request_array: tabs_latest_request_array ?? {},
  });
});


// set up default values
chrome.windows.onCreated.addListener(setupVariables);
chrome.runtime.onInstalled.addListener(setupVariables);
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) tabs_latest_request_array[tab.id] = [];
});

chrome.webRequest.onBeforeRequest.addListener(
  (details: chrome.webRequest.WebRequestBodyDetails) => {
    //remove calls from chrome extension
    if (details.initiator?.startsWith('chrome-extension://')) return;
    //keep only some methods
    if (!methodsToKeep.includes(details.method)) return;

    request_array = (request_array ?? []).concat(details);
    tabs_latest_request_array[details.tabId] = (tabs_latest_request_array[details.tabId] ?? []).concat(details);

    let n_stalkers = tabs_latest_request_array[details.tabId].length;
    BadgeService.setBadgeNumber(n_stalkers, details.tabId);

    chrome.storage.local.set({
      request_array,
      tabs_latest_request_array,
    });

    //remove requests from list after keepAliveTime passed
    chrome.storage.local.get(['key'], function(result:any) {
      keepAliveTime = (result.key)*1000;
    });
    setTimeout(() => {
      tabs_latest_request_array[details.tabId] = (tabs_latest_request_array[details.tabId] ?? []).slice(1);

      let n_stalkers = tabs_latest_request_array[details.tabId].length;
      BadgeService.setBadgeNumber(n_stalkers, details.tabId);

      chrome.storage.local.set({
        tabs_latest_request_array,
      });
    }, keepAliveTime);
  },
  { urls: [ "http://*/*", "https://*/*" ] }
);
