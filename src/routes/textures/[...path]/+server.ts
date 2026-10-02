import { proxyApiAssetUrls, textureUpstreamOrigin } from "$lib/shared/api/texture-proxy";
import { USER_AGENT } from "$lib/shared/constants/user-agent";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

// Proxies SkyCrypt API assets so they are requested with our User-Agent instead of the
// visitor's. Only images and the JSON from item `/resolve` lookups are passed through.
export const GET: RequestHandler = async ({ params, url }) => {
  const upstream = new URL(textureUpstreamOrigin());
  // Assigning the pathname (rather than resolving a relative URL) keeps `//host` paths on the API origin.
  upstream.pathname = `/${params.path}`;
  upstream.search = url.search;

  const response = await fetch(upstream, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    await response.body?.cancel();
    return new Response(null, { status: response.status === 404 ? 404 : 502 });
  }

  const contentType = response.headers.get("content-type") ?? "";
  const cacheControl = response.headers.get("cache-control") ?? "public, max-age=3600";

  if (upstream.pathname.endsWith("/resolve") && contentType.startsWith("application/json")) {
    return json(proxyApiAssetUrls(await response.json()), { headers: { "Cache-Control": cacheControl } });
  }

  if (!contentType.startsWith("image/")) {
    await response.body?.cancel();
    return new Response(null, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    }
  });
};
