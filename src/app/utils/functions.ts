import { fromUrl, parseDomain, ParseResult, ParseResultType } from 'parse-domain';
import { toUnicode } from 'punycode';

export function getTab (): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        function (tabs) {
          resolve(tabs[ 0 ]);
        }
      )
    } catch (e) {
      reject(e);
    }
  })
}

export function localStorageGet ( keys: string[] ): Promise<{[key: string]: any}> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(
        keys,
        function (object) {
          resolve(object);
        }
      )
    } catch (e) {
      reject(e);
    }
  })
}

export function domainFromUrl (url: string | undefined): string | undefined {
  if (!url) return undefined;
  const parseResult: ParseResult = parseDomain(
    fromUrl(url),
  );
  if (parseResult.type === ParseResultType.Listed) {
    const { subDomains, domain, topLevelDomains } = parseResult;
    return toUnicode(`${domain}.${topLevelDomains.join('.')}`);
  }
  return undefined;
}

export function hostFromUrl (url: string | undefined): string | undefined {
  if (!url) return undefined;
  const parseResult: ParseResult = parseDomain(
    fromUrl(url),
  );
  if (parseResult.type === ParseResultType.Listed) {
    const { subDomains, domain, topLevelDomains } = parseResult;
    return toUnicode(`${subDomains.join('.')}.${domain}.${topLevelDomains.join('.')}`);
  }
  return undefined;
}
