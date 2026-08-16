import type { NextConfig } from "next";

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
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
