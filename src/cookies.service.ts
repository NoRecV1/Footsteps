export class CookiesService {


    public static getCookies(details?: chrome.cookies.GetAllDetails): Promise<chrome.cookies.Cookie[]> {
        const domainObject = details ? details: {};
        const myPromise = new Promise <chrome.cookies.Cookie[]>(
            (resolve, reject) => {
                chrome.cookies.getAll(domainObject,
                    (cookies) => resolve(cookies)
                )

            }
        )
        return myPromise;
    }

}