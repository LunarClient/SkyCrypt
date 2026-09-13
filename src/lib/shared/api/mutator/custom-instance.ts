import { getRequestEvent } from "$app/server";
import { env as envPrivate } from "$env/dynamic/private";
import { env as envPublic } from "$env/dynamic/public";

const { PUBLIC_SERVER_API_URL } = envPublic;

// Cloudflare Secrets Store bindings expose the value through an async `get()`
// rather than as a plain string.
type SecretsStoreBinding = { get(): Promise<string> };

let cachedServerApiToken: Promise<string> | undefined;

// NOTE: Resolve the server API token from either a Secrets Store binding
// (production/development Workers) or a plain string (local `.env`).
const getServerApiToken = (): Promise<string> => {
  if (cachedServerApiToken) return cachedServerApiToken;

  const token: unknown = envPrivate.SERVER_API_TOKEN;
  let resolved: Promise<string>;

  if (token && typeof token === "object" && typeof (token as SecretsStoreBinding).get === "function") {
    resolved = (token as SecretsStoreBinding).get();
  } else {
    resolved = Promise.resolve(typeof token === "string" ? token : "");
  }

  cachedServerApiToken = resolved.catch((error) => {
    // Don't cache a failed lookup so the next request retries.
    cachedServerApiToken = undefined;
    throw error;
  });

  return cachedServerApiToken;
};

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

// NOTE: Add headers
const getHeaders = async (headers?: HeadersInit): Promise<HeadersInit> => {
  const serverApiToken = await getServerApiToken();

  try {
    const { request } = getRequestEvent();

    // Convert the request Headers object to a plain object
    const requestHeadersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      requestHeadersObj[key] = value;
    });

    const mergedHeaders: HeadersInit = {
      ...requestHeadersObj,
      ...headers,
      "X-API-Token": serverApiToken
    };

    return mergedHeaders;
  } catch {
    return {
      ...headers,
      "X-API-Token": serverApiToken
    };
  }
};

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  let fetchFunction = fetch;
  try {
    const event = getRequestEvent();
    fetchFunction = event.fetch;
  } catch {
    // Ignore this, we just won't have access to the request for this call
  }

  const requestUrl = getUrl(url);
  const requestHeaders = await getHeaders(options.headers);

  const requestInit: RequestInit = {
    ...options,
    headers: requestHeaders
  };

  const response = await fetchFunction(requestUrl, requestInit);
  const data = await getBody<T>(response);

  return { status: response.status, data, headers: response.headers } as T;
};
