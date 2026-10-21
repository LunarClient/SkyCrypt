import { dev } from "$app/env";
import { HYPERDX_API_KEY, HYPERDX_OTLP_ENDPOINT } from "$app/env/private";
import { PUBLIC_RELEASE_CHANNEL } from "$app/env/public";
import { sequence, type Handle, type HandleFetch, type HandleServerError } from "@sveltejs/kit/hooks";
import { initLogger, log, toLoggerConfig, toMiddlewareOptions, type DrainContext } from "evlog";
import { createFsDrain } from "evlog/fs";
import { createHyperDXDrain } from "evlog/hyperdx";
import { createDrainPipeline } from "evlog/pipeline";
import { createEvlogHooks } from "evlog/sveltekit";
import { USER_AGENT } from "#lib/shared/constants/user-agent";
import evlogConfig from "../evlog.config";

// This fork is a public stats/card embed (skycrypt-embed.lunarclient.com) deployed
// on Cloudflare Workers. It has no user accounts, so the upstream better-auth +
// Postgres pipeline is intentionally omitted: DB-backed session lookups need a
// database the embed doesn't have, and migrate-on-startup can't run on Workers
// (no filesystem / process.cwd). See src/lib/server/db/index.ts (lazy db).

// HyperDX in production (batched, retried), local NDJSON in dev for `evlog logs`. Stdout always stays on.
const hyperdxDrain = HYPERDX_OTLP_ENDPOINT
  ? createDrainPipeline<DrainContext>({
      batch: { size: 100, intervalMs: 5000 },
      retry: { maxAttempts: 3 },
      onDropped: (events, error) =>
        log.warn("evlog", `Dropped ${events.length} events: ${error?.message ?? "buffer full"}`)
    })(createHyperDXDrain({ endpoint: HYPERDX_OTLP_ENDPOINT, apiKey: HYPERDX_API_KEY }))
  : undefined;
const drain = hyperdxDrain ?? (dev ? createFsDrain({ maxFiles: 7 }) : undefined);

// Stable keeps NODE_ENV ("production") so existing HyperDX searches still match it.
const environment = !dev && PUBLIC_RELEASE_CHANNEL === "beta" ? "beta" : undefined;

initLogger({ ...toLoggerConfig({ ...evlogConfig, environment }), drain });

const { handle: evlogHandle } = createEvlogHooks({ ...toMiddlewareOptions(evlogConfig), drain });

// Not evlog's own handleError: since 2.33.1 it returns the right status (evloghq/evlog#911), but it still logs every Error as
// level error, so each bot-scan 404 would page as an error.
// Only unexpected errors are logged; returning nothing keeps SvelteKit's default status and message.
export const handleError: HandleServerError = ({ kind, error, event }) => {
  if (kind !== "unknown") return;
  if (error instanceof Error) event.locals.log?.error(error);
  else log.error({ action: "request.unhandled_error", path: event.url.pathname, error });
};

const headersHandler = (async ({ event, resolve }) => {
  const response = await resolve(event, {
    // Body text font; without this it only starts downloading once the CSS has been parsed.
    preload: (input) =>
      input.type === "js" ||
      input.type === "css" ||
      (input.type === "font" && input.filename.endsWith("montserrat-latin-wght-normal.woff2"))
  });

  // Security headers
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "accelerometer=(), autoplay=(), camera=(), encrypted-media=(), fullscreen=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), sync-xhr=(), usb=(), xr-spatial-tracking=(), geolocation=()"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  // No frame-locking: this fork is embedded as an iframe (skycrypt-embed.lunarclient.com),
  // so X-Frame-Options / frame-ancestors restrictions are intentionally omitted.

  // Cross-Origin policies
  // COEP intentionally unsafe-none: tightening would require all cross-origin
  // resources (textures.minecraft.net, skins.mcstats.com, etc.) to send CORP
  // headers, which they don't control.
  response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  // Legacy XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Signed-in responses can carry the user (header avatar, remote queries), so shared caches must not store them.
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (event.locals.user && !cacheControl.includes("private") && !cacheControl.includes("immutable")) {
    response.headers.set("cache-control", "private, no-store");
  }

  return response;
}) satisfies Handle;

// Every server-side `event.fetch` identifies as the embed, never as the visitor's browser.
export const handleFetch = (({ request, fetch }) => {
  const headers = new Headers(request.headers);
  headers.set("User-Agent", USER_AGENT);
  return fetch(new Request(request, { headers }));
}) satisfies HandleFetch;

export const handle = sequence(evlogHandle, headersHandler) satisfies Handle;
