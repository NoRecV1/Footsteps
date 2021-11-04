chrome.webRequest.onBeforeRequest.addListener(
  (details: chrome.webRequest.WebRequestBodyDetails) => {
    console.log(`[at ${Math.round(details?.timeStamp)}] Request sent in tab n°${details?.tabId} from ${details?.initiator} to ${(details?.url.length > 60) ? details?.url.substr(0, 60-1) + '…' : details?.url}\n\tBody details :`, details);
  },
  {urls: ["<all_urls>"]}
);
