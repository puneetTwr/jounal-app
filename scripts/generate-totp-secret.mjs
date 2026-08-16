// One-off setup CLI: generates a fresh TOTP secret for TOTP_SECRET and
// prints it in the forms you need — a manual-entry key for typing
// straight into an authenticator app, and an otpauth:// URI you can
// paste into any QR code generator if you'd rather scan than type.
//
// Deliberately a plain, dependency-free script rather than importing
// the TypeScript app code — this only ever runs once per setup (or
// once per rotation), so duplicating the ~10-line base32 encoder here
// is simpler than wiring a TS loader for a one-shot CLI.
import { randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function toBase32(bytes) {
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

const secret = toBase32(randomBytes(20));
const otpauthUri = `otpauth://totp/Personal%20Journal?secret=${secret}&issuer=Personal%20Journal&digits=6&period=30`;

console.log("Add this line to your .env.local (and your hosting platform's env vars at go-live):\n");
console.log(`TOTP_SECRET=${secret}\n`);
console.log("Manual entry key for your authenticator app:", secret);
console.log("\nOr paste this into any QR code generator and scan it instead:");
console.log(otpauthUri);
