/** Env var name for the single shared application password. Named constant so the literal string appears exactly once. */
export const JOURNAL_AUTH_PASSWORD_ENV_VAR = "JOURNAL_AUTH_PASSWORD";

/**
 * Returns the single shared password that gates access to the entire
 * application. There is no username and no per-user account — this is
 * intentionally the only credential that exists.
 *
 * There is no default value. If `JOURNAL_AUTH_PASSWORD` is unset or
 * empty, this throws immediately rather than silently leaving the app
 * unprotected or falling back to a guessable default.
 */
export function getAuthPassword(): string {
    const rawValue = process.env[JOURNAL_AUTH_PASSWORD_ENV_VAR];
    const password = rawValue?.trim();

    if (!password) {
        throw new Error(
            `Missing required environment variable "${JOURNAL_AUTH_PASSWORD_ENV_VAR}". ` +
                "This application requires a shared password to be configured before it can " +
                `start. Set ${JOURNAL_AUTH_PASSWORD_ENV_VAR} in your .env.local file.`
        );
    }

    return password;
}
