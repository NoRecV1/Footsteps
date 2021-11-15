const keepAliveTime = 15 * 1000; // time in latest arrays

let request_array: chrome.webRequest.WebRequestBodyDetails[] = [];
let latest_request_array: chrome.webRequest.WebRequestBodyDetails[] = [];
let tabs_latest_request_array: { [key: number]: chrome.webRequest.WebRequestBodyDetails[]} = {};

const setupVariables = () => chrome.storage.local.set({
  request_array: [],
  latest_request_array: [],
  tabs_latest_request_array: {},
});

// set up default values
chrome.windows.onCreated.addListener(setupVariables);
chrome.runtime.onInstalled.addListener(setupVariables);
chrome.tabs.onCreated.addListener((tab) => tabs_latest_request_array[tab.id ?? -1] = []);

chrome.webRequest.onBeforeRequest.addListener(
  (details: chrome.webRequest.WebRequestBodyDetails) => {
    console.log(`[at ${Math.round(details?.timeStamp)}] Request sent in tab n°${details?.tabId} from ${details?.initiator} to ${(details?.url.length > 60) ? details?.url.substr(0, 60 - 1) + '…' : details?.url}\n\tBody details :`, details);

    request_array = (request_array ?? []).concat(details);
    latest_request_array = (latest_request_array ?? []).concat(details);
    tabs_latest_request_array[details.tabId] = (tabs_latest_request_array[details.tabId] ?? []).concat(details);

    chrome.storage.local.set({
      request_array,
      latest_request_array,
      tabs_latest_request_array,
    });

    //remove requests from list after keepAliveTime passed
    setTimeout(() => {
      latest_request_array = (latest_request_array ?? []).slice(1);
      tabs_latest_request_array[details.tabId] = (tabs_latest_request_array[details.tabId] ?? []).slice(1);
      chrome.storage.local.set({
        latest_request_array,
        tabs_latest_request_array,
      });
    }, keepAliveTime);
  },
  { urls: [ "http://*/*", "https://*/*" ] }
);
