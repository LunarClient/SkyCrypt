import { handleErrorWithSentry, sentryHandle } from "@sentry/sveltekit";
import { type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

// This fork is a public stats/card embed (skycrypt-embed.lunarclient.com) deployed
// on Cloudflare Workers. It has no user accounts, so the upstream better-auth +
// Postgres pipeline is intentionally omitted: DB-backed session lookups need a
// database the embed doesn't have, and migrate-on-startup can't run on Workers
// (no filesystem / process.cwd). See src/lib/server/db/index.ts (lazy db).

const headersHandler = (async ({ event, resolve }) => {
  const response = await resolve(event);
  const { request, url } = event;

  // Security headers
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "accelerometer=(), autoplay=(), camera=(), encrypted-media=(), fullscreen=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), sync-xhr=(), usb=(), xr-spatial-tracking=(), geolocation=()");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  // No frame-locking: this fork is embedded as an iframe (skycrypt-embed.lunarclient.com),
  // so X-Frame-Options / frame-ancestors restrictions are intentionally omitted.

  // Cross-Origin policies
  // COEP intentionally unsafe-none: tightening would require all cross-origin
  // resources (textures.minecraft.net, nmsr.nickac.dev, etc.) to send CORP
  // headers, which they don't control.
  response.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  // Legacy XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const isCupcake = host.includes("cupcake.shiiyu.moe");

  if (isCupcake) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}) satisfies Handle;

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();

export const handle = sequence(sentryHandle(), headersHandler) satisfies Handle;
