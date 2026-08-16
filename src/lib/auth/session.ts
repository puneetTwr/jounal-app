/** Name of the cookie that marks a browser session as authenticated. */
export const SESSION_COOKIE_NAME = "journal_session";

/**
 * Hashes the shared password into an opaque session token using the
 * Web Crypto API (available in both the Node.js runtime and the Edge
 * middleware runtime, unlike `node:crypto`), so the same code can
 * produce and verify the token from either place.
 *
 * The cookie stores this hash rather than the password itself, so it
 * never carries the plaintext credential back and forth, and a stale
 * cookie stops working as soon as the password changes.
 */
async function hashPassword(password: string): Promise<string> {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

/** Computes the session token to store in the cookie once a password check succeeds. */
export async function createSessionToken(password: string): Promise<string> {
    return hashPassword(password);
}

/** Checks whether a cookie's token matches the current shared password. */
export async function isValidSessionToken(
    token: string | undefined,
    password: string
): Promise<boolean> {
    if (!token) {
        return false;
    }

    return token === (await hashPassword(password));
}
