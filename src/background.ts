import { CookiesService } from "./cookies.service";

chrome.webRequest.onBeforeRequest.addListener(
  (details: chrome.webRequest.WebRequestBodyDetails) => {
    //console.log(`[at ${Math.round(details?.timeStamp)}] Request sent in tab n°${details?.tabId} from ${details?.initiator} to ${(details?.url.length > 60) ? details?.url.substr(0, 60-1) + '…' : details?.url}\n\tBody details :`, details);
  },
  {urls: ["<all_urls>"]}
);

chrome.tabs.onUpdated.addListener((tabId: number, info: chrome.tabs.TabChangeInfo, tab) => {
  if (info.status === 'complete') {
    var url = (new URL(tab?.url as string))
    console.log(url.hostname);
    CookiesService.getCookies({domain: url.hostname}).then(
      (cookies)=>{
        console.log(cookies);
      }
    )
  }
});
