chrome.webRequest.onBeforeRequest.addListener(
  (details: chrome.webRequest.WebRequestBodyDetails) => {
    console.log(`[at ${Math.round(details?.timeStamp)}] Request sent in tab n°${details?.tabId} from ${details?.initiator} to ${(details?.url.length > 60) ? details?.url.substr(0, 60-1) + '…' : details?.url}\n\tBody details :`, details);
    chrome.runtime.sendMessage({type: 'before_request', data: details});
    // chrome.tabs.sendMessage()
  },
  {urls: ["<all_urls>"]}
);
