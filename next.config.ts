import type { NextConfig } from "next";
// Relative imports, not the "@/*" alias — next.config.ts is loaded by
// Next's own config loader outside the app's normal module-resolution
// pipeline, which doesn't apply tsconfig path aliases.
import { getAllowedServerActionOrigins } from "./src/lib/config/productionOriginConfig";
import { isProductionRuntime } from "./src/lib/config/runtimeConfig";

/**
 * Cheap, no-tuning-required security headers applied to every response.
 * Deliberately skips a hand-tuned Content-Security-Policy — real
 * tuning cost against the Markdown editor for little extra gain on a
 * single-operator app (see SECURITY_HARDENING_CHECKLIST.md item 10).
 *
 * Strict-Transport-Security is only sent in production, and even then
 * only once HTTPS on the actual deployed host has been verified
 * (checklist item 6) — turning it on before that's confirmed risks
 * permanently locking browsers out of an app that turns out to still
 * be reachable over plain HTTP.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  ...(isProductionRuntime()
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

/**
 * Pins the origin(s) allowed to bypass Server Actions' same-origin CSRF
 * check, once PRODUCTION_ORIGIN names a stable production domain (see
 * SECURITY_HARDENING_CHECKLIST.md item 14). Omitted entirely — not set
 * to an empty array — when unset, so local development and any
 * deployment without a fixed domain yet keep Next's own default
 * same-origin inference untouched.
 */
const allowedServerActionOrigins = getAllowedServerActionOrigins();

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  ...(allowedServerActionOrigins
    ? { experimental: { serverActions: { allowedOrigins: allowedServerActionOrigins } } }
    : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
