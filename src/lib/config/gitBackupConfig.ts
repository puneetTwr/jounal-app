/** Env var names for the Git backup feature. Named constants so the literal strings appear exactly once. */
export const JOURNAL_CONTENT_GIT_REMOTE_URL_ENV_VAR = "JOURNAL_CONTENT_GIT_REMOTE_URL";
export const JOURNAL_CONTENT_GIT_TOKEN_ENV_VAR = "JOURNAL_CONTENT_GIT_TOKEN";

export interface GitBackupConfig {
    remoteUrl: string;
    token: string;
}

/**
 * Returns the Git backup configuration, or `null` if either env var is
 * unset or empty. Unlike `getJournalContentRoot()`, this does not throw
 * — Git backup is an optional feature the rest of the application must
 * keep working without, so an unconfigured state is a normal, expected
 * condition for callers to handle, not a startup failure.
 */
export function getGitBackupConfig(): GitBackupConfig | null {
    const remoteUrl = process.env[JOURNAL_CONTENT_GIT_REMOTE_URL_ENV_VAR]?.trim();
    const token = process.env[JOURNAL_CONTENT_GIT_TOKEN_ENV_VAR]?.trim();

    if (!remoteUrl || !token) {
        return null;
    }

    return { remoteUrl, token };
}
