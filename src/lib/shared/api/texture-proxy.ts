import { env } from "$env/dynamic/public";

/**
 * Same-origin path that SkyCrypt API assets (item renders, heads, resolved textures) are loaded through, so the browser
 * never requests them from the API host with its own User-Agent.
 */
export const TEXTURE_PROXY_PATH = "/textures";

const apiOrigins = (): string[] => {
  const urls = [env.PUBLIC_API_URL, env.PUBLIC_SERVER_API_URL].filter((url): url is string => !!url);
  return [...new Set(urls.map((url) => new URL(url).origin))];
};

/** The origin the proxy fetches from; the server URL may be a private hostname (e.g. Docker). */
export const textureUpstreamOrigin = (): string => new URL(env.PUBLIC_SERVER_API_URL).origin;

/** Rewrites every absolute SkyCrypt API URL inside `data` to its same-origin proxy path. */
export function proxyApiAssetUrls<T>(data: T): T {
  const prefixes = apiOrigins().map((origin) => `${origin}/`);

  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      const prefix = prefixes.find((p) => value.startsWith(p));
      return prefix ? `${TEXTURE_PROXY_PATH}/${value.slice(prefix.length)}` : value;
    }
    if (Array.isArray(value)) return value.map(walk);
    // Only plain JSON objects; leave Blobs (PNG endpoints) and other instances untouched.
    if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, walk(entry)]));
    }
    return value;
  };

  return walk(data) as T;
}

/** Points proxied paths in server-rendered markup back at the API, for renderers without an origin. */
export function unproxyApiAssetUrls(html: string): string {
  return html.replaceAll(`"${TEXTURE_PROXY_PATH}/`, `"${textureUpstreamOrigin()}/`);
}
