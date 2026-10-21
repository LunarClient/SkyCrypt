import { building } from "$app/env";
import { SERVER_API_TOKEN } from "$app/env/private";
import { PUBLIC_SERVER_API_URL } from "$app/env/public";
import { getRequestEvent } from "$app/server";
import { proxyApiAssetUrls } from "#lib/shared/api/texture-proxy";
import { USER_AGENT } from "#lib/shared/constants/user-agent";
import { toBackendPath } from "./backend-path";
import { readApiResponse } from "./readApiResponse";

// NOTE: Update just base url
const getUrl = (contextUrl: string): string => {
  // Remove the trailing /api/ if present
  const baseUrl = PUBLIC_SERVER_API_URL.replace(/\/api\/?$/, "");
  const requestUrl = new URL(`${baseUrl}${toBackendPath(contextUrl)}`);

  return requestUrl.toString();
};

// NOTE: Returns null when called outside of a request (e.g. at build time)
const tryGetRequestEvent = () => {
  try {
    return getRequestEvent();
  } catch {
    return null;
  }
};

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const event = tryGetRequestEvent();

  // Deployed Workers get a Secrets Store binding; local dev and prerender get a plain string. Prefer the
  // env string: during `vite build` the platform proxy exposes a binding whose get() fails because the
  // secret only exists remotely. `||`, not `??`: an unset variable reads as "" from $app/env/private.
  const token = (SERVER_API_TOKEN as App.Platform["env"]["SERVER_API_TOKEN"]) || event?.platform?.env.SERVER_API_TOKEN;
  const serverApiToken = typeof token === "string" ? token : ((await token?.get()) ?? "");

  const headers = new Headers(options.headers);
  // Only resource-pack preferences belong to the API. Forwarding browser cookies and
  // Access JWT headers can exceed the upstream request-header limit.
  const enabledPacksCookie = event?.request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("enabledPacks="));
  if (enabledPacksCookie && !headers.has("cookie")) {
    headers.set("Cookie", enabledPacksCookie);
  }
  // Replace any caller token regardless of its header casing.
  headers.delete("X-API-Token");
  // Lets CI prerender through the Cloudflare maintenance redirect. Read at runtime so the secret is never bundled.
  if (building && process.env.MAINTENANCE_BYPASS_TOKEN) {
    headers.set("X-Maintenance-Bypass", process.env.MAINTENANCE_BYPASS_TOKEN);
  }

  const requestInit: RequestInit = {
    ...options,
    // Prevent SvelteKit's fetch from adding browser cookies/authorization back.
    credentials: "omit",
    headers: {
      ...Object.fromEntries(headers),
      "X-API-Token": serverApiToken,
      "User-Agent": USER_AGENT
    }
  };

  const requestUrl = getUrl(url);
  // During prerender, event.fetch resolves URLs on ORIGIN's host through the app's own router, so the
  // backend (served on that same host) is never reached and every call 404s. Use the global fetch instead.
  const fetchFunction = (!building && event?.fetch) || fetch;
  const response = await fetchFunction(requestUrl, requestInit);
  // Asset URLs go through our texture proxy so the browser never fetches them from the API directly.
  const data = proxyApiAssetUrls(await readApiResponse(response, requestUrl, requestInit.method));

  return { status: response.status, data, headers: response.headers } as T;
};
