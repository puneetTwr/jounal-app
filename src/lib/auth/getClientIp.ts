import { headers } from "next/headers";

/**
 * Best-effort real client IP for the current request, used only to key
 * the in-memory login rate limiter (`loginRateLimiter.ts`) — never for
 * an access-control decision that assumes it can't be spoofed.
 *
 * Header precedence: `Fly-Client-IP` first (set directly by Fly.io's
 * edge; not attacker-controlled as long as Fly is the sole proxy in
 * front of the app), then the first (leftmost) entry of
 * `X-Forwarded-For` (what Railway's edge proxy documents as the real
 * client IP, stripping/overwriting rather than trusting whatever the
 * client sent), then `X-Real-IP`. Falling back through all three keeps
 * this working across the hosts this app targets (see
 * IMPLEMENTATION_PLAN.md), but header shape is genuinely
 * platform-specific and has been known to shift — re-verify against the
 * actual deployed host at go-live (SECURITY_HARDENING_CHECKLIST.md
 * items 3 and 6) and adjust this precedence if it doesn't match.
 *
 * Grouping every request with none of these headers under one
 * "unknown" bucket (rather than skipping rate limiting for it) is a
 * deliberate fail-closed choice: worst case, unrelated direct/local
 * requests share a lockout; that's safer than an easy way to bypass the
 * limiter by omitting the headers entirely.
 */
export async function getClientIp(): Promise<string> {
    const headerList = await headers();

    const flyClientIp = headerList.get("fly-client-ip")?.trim();
    if (flyClientIp) {
        return flyClientIp;
    }

    const forwardedFor = headerList.get("x-forwarded-for");
    const firstForwardedHop = forwardedFor?.split(",")[0]?.trim();
    if (firstForwardedHop) {
        return firstForwardedHop;
    }

    const realIp = headerList.get("x-real-ip")?.trim();
    if (realIp) {
        return realIp;
    }

    return "unknown";
}
