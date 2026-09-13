import { getRequestEvent } from "$app/server";
import { env as envPrivate } from "$env/dynamic/private";
import { env as envPublic } from "$env/dynamic/public";
import { readApiResponse } from "./readApiResponse";

const { PUBLIC_SERVER_API_URL } = envPublic;

// NOTE: Update just base url
const getUrl = (contextUrl: string): string => {
  // Remove the trailing /api/ if present
  const baseUrl = PUBLIC_SERVER_API_URL.replace(/\/api\/?$/, "");
  const requestUrl = new URL(`${baseUrl}${contextUrl}`);

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

  // Deployed Workers get a Secrets Store binding (also surfaced through $env/dynamic/private);
  // local dev and prerender get a plain string. Prefer the dynamic env: during `vite build` the
  // platform proxy exposes a binding whose get() fails because the secret only exists remotely.
  const token =
    (envPrivate.SERVER_API_TOKEN as App.Platform["env"]["SERVER_API_TOKEN"]) ?? event?.platform?.env.SERVER_API_TOKEN;
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

  const requestInit: RequestInit = {
    ...options,
    // Prevent SvelteKit's fetch from adding browser cookies/authorization back.
    credentials: "omit",
    headers: {
      ...Object.fromEntries(headers),
      "X-API-Token": serverApiToken,
      "User-Agent": "Lunar Client (skycrypt-embed.lunarclient.com)"
    }
  };

  const requestUrl = getUrl(url);
  const response = await (event?.fetch ?? fetch)(requestUrl, requestInit);
  const data = await readApiResponse(response, requestUrl, requestInit.method);

  return { status: response.status, data, headers: response.headers } as T;
};
