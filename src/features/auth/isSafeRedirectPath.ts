/**
 * Whether `path` is safe to redirect to after a successful login: a
 * plain in-app path, and nothing else. Rejects protocol-relative URLs
 * ("//evil.example", which browsers resolve to a different host even
 * though the string starts with "/"), absolute URLs containing "://",
 * and backslashes (which some browsers normalize to forward slashes,
 * turning "/\evil.example" into the same protocol-relative trick).
 *
 * `next` reaching this check ultimately comes from a query parameter
 * an attacker can set in a link they send someone, so it must never be
 * used for navigation without passing this first.
 */
export function isSafeRedirectPath(path: string | undefined): path is string {
    if (!path) {
        return false;
    }

    return path.startsWith("/") && !path.startsWith("//") && !path.includes("://") && !path.includes("\\");
}
