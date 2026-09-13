import { getRequestEvent } from "$app/server";
import { env as envPrivate } from "$env/dynamic/private";
import { env as envPublic } from "$env/dynamic/public";

const { PUBLIC_SERVER_API_URL } = envPublic;

// NOTE: Supports cases where `content-type` is other than `json`
const getBody = <T>(c: Response | Request): Promise<T> => {
  const contentType = c.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    return c.json();
  }

  return c.text() as Promise<T>;
};

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

  // Deployed Workers get a Secrets Store binding; local dev and prerender get a plain string
  const token = event?.platform?.env.SERVER_API_TOKEN ?? envPrivate.SERVER_API_TOKEN;
  const serverApiToken = typeof token === "string" ? token : await token.get();

  const requestInit: RequestInit = {
    ...options,
    headers: {
      ...(event ? Object.fromEntries(event.request.headers) : {}),
      ...options.headers,
      "X-API-Token": serverApiToken
    }
  };

  const response = await (event?.fetch ?? fetch)(getUrl(url), requestInit);
  const data = await getBody<T>(response);

  return { status: response.status, data, headers: response.headers } as T;
};
