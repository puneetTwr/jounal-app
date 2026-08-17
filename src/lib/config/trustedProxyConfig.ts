/** Env var name selecting which hosting platform's edge proxy sits in front of this app, if any. */
export const TRUSTED_PROXY_ENV_VAR = "TRUSTED_PROXY";

export type TrustedProxy = "none" | "fly" | "railway" | "render" | "vercel";

const VALID_TRUSTED_PROXIES: readonly TrustedProxy[] = ["none", "fly", "railway", "render", "vercel"];

function isTrustedProxy(value: string): value is TrustedProxy {
    return (VALID_TRUSTED_PROXIES as readonly string[]).includes(value);
}

/**
 * Which hosting platform's edge proxy sits in front of this app, if
 * any — determines which request header `getClientIp()` trusts as the
 * real client IP for login rate limiting (see
 * SECURITY_HARDENING_CHECKLIST.md item 3: "confirm which header/
 * position [the platform] actually populates — don't blindly trust the
 * first X-Forwarded-For hop, which a client can spoof").
 *
 * Unlike `getStorageBackend()`, an unset or unrecognized value does
 * *not* throw — it defaults to `"none"` (untrusted). The two functions
 * fail in opposite directions on purpose: picking the wrong storage
 * backend means silently reading/writing the wrong data, which must be
 * loud; picking the wrong trusted-proxy value only ever makes rate
 * limiting *more* conservative (bucketing more requests under
 * "unknown"), never less safe — so a typo here should degrade quietly
 * rather than take the app down.
 */
export function getTrustedProxy(): TrustedProxy {
    const rawValue = process.env[TRUSTED_PROXY_ENV_VAR]?.trim().toLowerCase();

    if (!rawValue || !isTrustedProxy(rawValue)) {
        return "none";
    }

    return rawValue;
}
