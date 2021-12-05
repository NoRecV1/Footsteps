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

    public static setUpBadgeNumber(count: number){
        count  > this.countThreshold ? chrome.browserAction.setBadgeText({
            text: "99+"
        }) :
        chrome.browserAction.setBadgeText({
            text: count.toString()
        });

    }
}