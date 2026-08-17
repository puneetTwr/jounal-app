/** Env var name for the production origin(s) allowed to bypass Server Actions' same-origin CSRF check. */
export const PRODUCTION_ORIGIN_ENV_VAR = "PRODUCTION_ORIGIN";

/**
 * Comma-separated list of origins allowed to bypass Next's Server
 * Actions CSRF check (consumed by `next.config.ts`'s
 * `experimental.serverActions.allowedOrigins`) — e.g. a custom domain
 * and/or the platform's own `*.vercel.app` URL. Each entry is a bare
 * host (and optionally a wildcard subdomain), not a full URL — no
 * `https://` prefix.
 *
 * Optional: returns `undefined` when unset, so `next.config.ts` can
 * leave Next's own default same-origin inference untouched until a
 * stable production domain exists — see
 * SECURITY_HARDENING_CHECKLIST.md item 14.
 */
export function getAllowedServerActionOrigins(): string[] | undefined {
    const rawValue = process.env[PRODUCTION_ORIGIN_ENV_VAR]?.trim();

    if (!rawValue) {
        return undefined;
    }

    const origins = rawValue
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);

    return origins.length > 0 ? origins : undefined;
}
