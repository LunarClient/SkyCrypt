import { error } from "@sveltejs/kit";

/** Reject upstream error pages before they can be used or prerendered as API data. */
export async function readApiResponse(response: Response, requestUrl: string, method = "GET"): Promise<unknown> {
  const { origin, pathname } = new URL(requestUrl);
  const contentType = response.headers.get("content-type");
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
  const rayId = response.headers.get("cf-ray");
  // Omit query strings, credentials, and response bodies from diagnostics.
  const details = [
    `upstream HTTP ${response.status} ${response.statusText}`.trim(),
    `Content-Type: ${contentType || "missing"}`,
    ...(rayId ? [`CF-Ray: ${rayId}`] : [])
  ].join("; ");

  const fail = (reason: string, status = 502): never => {
    error(status, `SkyCrypt API ${method} ${origin}${pathname} failed: ${reason} (${details})`);
  };

  if (response.headers.get("cf-mitigated") === "challenge") {
    await response.body?.cancel();
    fail("Cloudflare challenged the request (cf-mitigated: challenge). Check the upstream WAF/bot protection rules.");
  }

  const isJson =
    mediaType === "application/json" || (mediaType?.startsWith("application/") && mediaType.endsWith("+json"));
  if (!isJson) {
    // The generated client also exposes image-rendering endpoints that return PNG bytes.
    if (response.ok && mediaType === "image/png") {
      return response.blob();
    }

    await response.body?.cancel();
    const hint =
      mediaType === "text/html"
        ? " HTML may indicate a WAF challenge, an Access login page, or an upstream proxy error."
        : "";
    fail(`Expected a JSON API response.${hint}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    fail("The upstream API returned invalid JSON.");
  }

  const apiError =
    typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
      ? data.error
      : undefined;

  if (!response.ok || apiError) {
    const status = response.status >= 400 && response.status < 600 ? response.status : 502;
    fail(apiError || "The upstream API returned an unsuccessful response.", status);
  }

  return data;
}
