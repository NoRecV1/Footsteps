export class BadgeService {


    static countThreshold: number = 99;


    public static setUpBadgeBackGroundColor(color: string){
        chrome.browserAction.setBadgeBackgroundColor({
            color: color
        })
    }

    public static resetBadgeText(){
        chrome.browserAction.setBadgeText({
            text: ""
        })
    }

    private static setBadgeText(details: chrome.browserAction.BadgeTextDetails) {
        chrome.browserAction.setBadgeText(details, () => {
            if (chrome.runtime.lastError) return; //tab doesn't exists, avoid error
        });
    }

    public static setBadgeNumber(count: number, tabId?: number){
        let text = '';
        if (count > this.countThreshold) {
            text = `${this.countThreshold}+`
        }
        else if (count > 0) {
            text = `${count}`;
        }
        this.setBadgeText({
            text,
            tabId,
        });
    }
}