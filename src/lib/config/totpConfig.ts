/** Env var name for the base32 TOTP shared secret. Named constant so the literal string appears exactly once. */
export const TOTP_SECRET_ENV_VAR = "TOTP_SECRET";

/**
 * Returns the base32-encoded shared secret used to verify the second
 * login factor (see `src/lib/auth/totp.ts`). Generate one with
 * `npm run totp:generate` and enter it into an authenticator app once
 * — there is no per-user account to register it against, since this
 * app has exactly one operator.
 *
 * There is no default value. If `TOTP_SECRET` is unset or empty, this
 * throws immediately rather than silently accepting any 6-digit code.
 */
export function getTotpSecret(): string {
    const rawValue = process.env[TOTP_SECRET_ENV_VAR];
    const secret = rawValue?.trim();

    if (!secret) {
        throw new Error(
            `Missing required environment variable "${TOTP_SECRET_ENV_VAR}". ` +
                "This application requires a TOTP secret for its second login factor. " +
                `Run \`npm run totp:generate\` and set ${TOTP_SECRET_ENV_VAR} in your .env.local file.`
        );
    }

    return secret;
}
