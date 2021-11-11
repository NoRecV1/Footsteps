export class CookiesService {


    public static getCookies() {
        chrome.cookies.getAll({}).then(
            (cookies) => {
                return cookies;
            }
        )
    }

}