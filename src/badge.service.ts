export class BadgeService {


    static countThreshold: number = 10;


    public static setUpBadgeBackGroundColor(color: string){
        chrome.action.setBadgeBackgroundColor({
            color: color
        })
    }

    public static setUpBadgeNumber(count: number){
        count  > this.countThreshold ? chrome.action.setBadgeText({
            text: "10+"
        }) :
        chrome.action.setBadgeText({
            text: count.toString()
        });

    }
}