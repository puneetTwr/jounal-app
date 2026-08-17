import { headers } from "next/headers";
import { getTrustedProxy } from "@/lib/config";

/** Extracts the leftmost (client-nearest-hop) entry of a comma-separated `X-Forwarded-For` value. */
function firstForwardedHop(headerValue: string | null): string | undefined {
    return headerValue?.split(",")[0]?.trim() || undefined;
}

/**
 * Best-effort real client IP for the current request, used only to key
 * the in-memory login rate limiter (`loginRateLimiter.ts`) — never for
 * an access-control decision that assumes it can't be spoofed.
 *
 * Which header is trusted is explicit configuration (`TRUSTED_PROXY`),
 * not a guessed fallback chain tried in a fixed order regardless of
 * which platform is actually in front of the app — see
 * `src/lib/config/trustedProxyConfig.ts`. Trying every known platform's
 * header unconditionally would mean the app trusts whichever one
 * happens to be present, which a client controls whenever the real
 * proxy in front of the app doesn't itself set that header.
 *
 * Grouping every request with no trusted header present under one
 * "unknown" bucket (rather than skipping rate limiting for it) is a
 * deliberate fail-closed choice: worst case, unrelated direct/local
 * requests share a lockout; that's safer than an easy way to bypass the
 * limiter by omitting the header entirely.
 */
export async function getClientIp(): Promise<string> {
    const headerList = await headers();
    const trustedProxy = getTrustedProxy();

    switch (trustedProxy) {
        case "fly":
            return headerList.get("fly-client-ip")?.trim() || "unknown";

        // Both platforms document X-Forwarded-For's leftmost entry as the
        // real client IP, with their edge stripping/overwriting whatever a
        // client sent rather than passing it through untouched.
        case "railway":
        case "vercel":
            return firstForwardedHop(headerList.get("x-forwarded-for")) || "unknown";

        case "render":
            return headerList.get("x-real-ip")?.trim() || "unknown";

        case "none":
            return "unknown";
    }
}
