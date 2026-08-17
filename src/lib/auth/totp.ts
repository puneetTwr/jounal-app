/**
 * Minimal RFC 6238 (TOTP) / RFC 4226 (HOTP) implementation, using the
 * same Web Crypto API already relied on elsewhere in this module
 * (`session.ts`) rather than adding a dependency for what's a few dozen
 * lines of well-specified math. Compatible with any standard
 * authenticator app (Google Authenticator, Authy, 1Password, etc.) —
 * the secret is a base32 string, exactly what those apps expect for
 * manual entry.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
/** How many steps before/after the current one still count as valid, to tolerate clock drift between server and authenticator app. */
const TOTP_DRIFT_STEPS = 1;

/** Decodes a base32 string (RFC 4648, case-insensitive, padding optional) into raw bytes. */
function base32Decode(input: string): Uint8Array<ArrayBuffer> {
    const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");

    let bits = "";
    for (const char of cleaned) {
        const value = BASE32_ALPHABET.indexOf(char);
        bits += value.toString(2).padStart(5, "0");
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return new Uint8Array(bytes);
}

/** Encodes raw bytes as a base32 string (RFC 4648, no padding) — used only to generate new setup secrets. */
function base32Encode(bytes: Uint8Array): string {
    let bits = "";
    for (const byte of bytes) {
        bits += byte.toString(2).padStart(8, "0");
    }

    let output = "";
    for (let i = 0; i + 5 <= bits.length; i += 5) {
        output += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
    }

    return output;
}

/** Generates a fresh, random base32 TOTP secret suitable for `TOTP_SECRET`. */
export function generateTotpSecret(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(20));
    return base32Encode(randomBytes);
}

function counterToBytes(counter: number): Uint8Array<ArrayBuffer> {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    // Counter is `unixSeconds / 30`, nowhere near the 32-bit ceiling in
    // any realistic timeframe, so only the low 32 bits are ever set.
    view.setUint32(4, counter, false);
    return new Uint8Array(buffer);
}

/** RFC 4226 HOTP: an HMAC-SHA1-based one-time code for `secretBytes` at `counter`. */
async function computeHotp(secretBytes: Uint8Array<ArrayBuffer>, counter: number): Promise<string> {
    const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
    const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterToBytes(counter)));

    const offset = signature[signature.length - 1] & 0x0f;
    const binary =
        ((signature[offset] & 0x7f) << 24) |
        ((signature[offset + 1] & 0xff) << 16) |
        ((signature[offset + 2] & 0xff) << 8) |
        (signature[offset + 3] & 0xff);

    return (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
}

async function computeTotpCode(secret: string, unixTimeSeconds: number): Promise<string> {
    const counter = Math.floor(unixTimeSeconds / TOTP_STEP_SECONDS);
    return computeHotp(base32Decode(secret), counter);
}

/**
 * Whether `code` is a valid current TOTP code for `secret`, allowing
 * one step (30s) of drift in either direction so a slightly-off device
 * clock doesn't lock a legitimate login out.
 */
export async function isValidTotpCode(code: string, secret: string): Promise<boolean> {
    if (!/^\d{6}$/.test(code)) {
        return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    for (let drift = -TOTP_DRIFT_STEPS; drift <= TOTP_DRIFT_STEPS; drift += 1) {
        const candidate = await computeTotpCode(secret, nowSeconds + drift * TOTP_STEP_SECONDS);
        if (candidate === code) {
            return true;
        }
    }

    return false;
}
