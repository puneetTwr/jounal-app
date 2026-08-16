/** Name of the cookie that marks a browser session as authenticated. */
export const SESSION_COOKIE_NAME = "journal_session";

/** How long an issued session token remains valid, regardless of activity. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Hashes the shared password using the Web Crypto API (available in
 * both the Node.js runtime and the Edge middleware runtime, unlike
 * `node:crypto`), so the same code can produce and verify a token from
 * either place. Only ever used as an input folded into the session
 * token's signature below — never stored or compared on its own.
 */
async function hashPassword(password: string): Promise<string> {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);

    return bufferToHex(digest);
}

/** HMAC-SHA256's `message` with `secret`, returning the signature as a hex string. */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));

    return bufferToHex(signature);
}

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Builds the exact string that gets signed for a given nonce/expiry:
 * the nonce and expiry themselves, plus a hash of the current password
 * (never the password itself). Folding the password hash into the
 * signed payload is what makes a password change invalidate every
 * outstanding session automatically — the signature simply stops
 * matching once `password` no longer matches what a token was signed
 * against, with no separate revocation list to maintain.
 */
async function buildSignedPayload(nonce: string, expiresAt: number, password: string): Promise<string> {
    const passwordHash = await hashPassword(password);
    return `${nonce}.${expiresAt}.${passwordHash}`;
}

/**
 * Computes a new session token: a random per-login nonce and an
 * absolute expiry, signed with `sessionSecret` (and bound to the
 * current password — see buildSignedPayload). Two logins produce two
 * different, unpredictable tokens even for the same password, unlike
 * the previous `sha256(password)` scheme, which was identical on every
 * device forever.
 */
export async function createSessionToken(password: string, sessionSecret: string): Promise<string> {
    const nonce = crypto.randomUUID();
    const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
    const signature = await hmacSha256Hex(sessionSecret, await buildSignedPayload(nonce, expiresAt, password));

    return `${nonce}.${expiresAt}.${signature}`;
}

/**
 * Checks whether a cookie's token is well-formed, unexpired, and
 * correctly signed for the current password and `sessionSecret`. A
 * token that fails any one of those (malformed, expired, or signed
 * against a password/secret that has since changed) is rejected.
 */
export async function isValidSessionToken(
    token: string | undefined,
    password: string,
    sessionSecret: string
): Promise<boolean> {
    if (!token) {
        return false;
    }

    const [nonce, expiresAtRaw, signature] = token.split(".");
    const expiresAt = Number(expiresAtRaw);

    if (!nonce || !expiresAtRaw || !signature || !Number.isFinite(expiresAt)) {
        return false;
    }

    if (Date.now() > expiresAt) {
        return false;
    }

    const expectedSignature = await hmacSha256Hex(
        sessionSecret,
        await buildSignedPayload(nonce, expiresAt, password)
    );

    return signature === expectedSignature;
}
