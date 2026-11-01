import { PUBLIC_SERVER_API_URL } from "$app/env/public";

/**
 * Same-origin path that SkyCrypt API assets (item renders, heads, resolved textures) are loaded through, so the browser
 * never requests them from the API host with its own User-Agent.
 */
export const TEXTURE_PROXY_PATH = "/textures";

// Public SkyCrypt API hosts that can appear in API responses regardless of which one we call
// (e.g. api.shiiyu.moe resolves items to beta-api.shiiyu.moe renders). They don't all serve the same
// files: cached renders only exist on the host that rendered them, so proxy paths keep the host.
const PUBLIC_API_HOSTS = ["api.shiiyu.moe", "beta-api.shiiyu.moe", "sky.shiiyu.moe"];

/** The origin the proxy fetches from; the server URL may be a private hostname (e.g. Docker). */
export const textureUpstreamOrigin = (): string => new URL(PUBLIC_SERVER_API_URL).origin;

// `/textures/<path>` is on the upstream origin; `/textures/<host>/<path>` is on another public API host.
function proxyPrefixes(): [origin: string, proxyPath: string][] {
  const upstream = textureUpstreamOrigin();
  const others = PUBLIC_API_HOSTS.filter((host) => `https://${host}` !== upstream);
  return [
    [upstream, TEXTURE_PROXY_PATH],
    ...others.map((host): [string, string] => [`https://${host}`, `${TEXTURE_PROXY_PATH}/${host}`])
  ];
}

/** The API URL a proxied path (without the `/textures/` prefix) is fetched from. */
export function textureUpstreamUrl(path: string): URL {
  const [first, ...rest] = path.split("/");
  const host = PUBLIC_API_HOSTS.includes(first) ? first : undefined;
  const upstream = new URL(host ? `https://${host}` : textureUpstreamOrigin());
  // Assigning the pathname (rather than resolving a relative URL) keeps `//host` paths on the API origin.
  upstream.pathname = `/${host ? rest.join("/") : path}`;
  return upstream;
}

// The API embeds nmsr.nickac.dev player renders; serve the skins.mcstats.com equivalent instead.
const NMSR_URL = /^https:\/\/nmsr\.nickac\.dev\/([a-z]+)\/([^/?#]+)/;
const MCSTATS_RENDERS: Record<string, string> = {
  face: "face/{id}?size=512",
  headiso: "skull/{id}?scale=2",
  bust: "bust/{id}?scale=2",
  fullbody: "body/front/{id}?scale=2"
};

function mcstatsRenderUrl(url: string): string | null {
  const [, mode, id] = url.match(NMSR_URL) ?? [];
  const render = mode ? MCSTATS_RENDERS[mode] : undefined;
  return render ? `https://skins.mcstats.com/${render.replace("{id}", id)}` : null;
}

/**
 * Rewrites every absolute SkyCrypt API URL inside `data` to its same-origin proxy path, and nmsr.nickac.dev renders to
 * skins.mcstats.com.
 */
export function proxyApiAssetUrls<T>(data: T): T {
  const prefixes = proxyPrefixes();

  const walk = (value: unknown): unknown => {
    if (typeof value === "string") {
      const prefix = prefixes.find(([origin]) => value.startsWith(`${origin}/`));
      if (prefix) return `${prefix[1]}/${value.slice(prefix[0].length + 1)}`;
      return mcstatsRenderUrl(value) ?? value;
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
  let result = html;
  for (const host of PUBLIC_API_HOSTS) {
    result = result.replaceAll(`"${TEXTURE_PROXY_PATH}/${host}/`, `"https://${host}/`);
  }
  return result.replaceAll(`"${TEXTURE_PROXY_PATH}/`, `"${textureUpstreamOrigin()}/`);
}
