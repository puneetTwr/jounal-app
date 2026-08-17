/** Env var name for the random, server-only secret used to sign session tokens. Named constant so the literal string appears exactly once. */
export const SESSION_SECRET_ENV_VAR = "SESSION_SECRET";

/**
 * Returns the random, server-only secret used to sign session tokens
 * (see `src/lib/auth/session.ts`). Kept entirely separate from
 * `JOURNAL_AUTH_PASSWORD` — the password is a human-chosen credential
 * the user types in, this is a long random value nobody ever enters,
 * so a session token can't be derived from the password alone.
 *
 * There is no default value. If `SESSION_SECRET` is unset or empty,
 * this throws immediately rather than silently signing sessions with a
 * predictable value.
 */
export function getSessionSecret(): string {
    const rawValue = process.env[SESSION_SECRET_ENV_VAR];
    const secret = rawValue?.trim();

    if (!secret) {
        throw new Error(
            `Missing required environment variable "${SESSION_SECRET_ENV_VAR}". ` +
                "This application requires a random session-signing secret to be configured before it can " +
                `start. Set ${SESSION_SECRET_ENV_VAR} in your .env.local file (e.g. \`openssl rand -hex 32\`).`
        );
    }

    return secret;
}
