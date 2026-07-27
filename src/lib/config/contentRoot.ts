/**
 * Name of the environment variable that configures where journal
 * content lives. Kept as a named constant so the literal string
 * appears exactly once in the codebase.
 */
export const JOURNAL_CONTENT_ROOT_ENV_VAR = "JOURNAL_CONTENT_ROOT";

/**
 * Returns the configured content root: the filesystem path to the
 * journal content repository. This may point anywhere on disk,
 * including a directory that is itself a separate Git repository
 * from this application's own codebase.
 *
 * There is no default value. If `JOURNAL_CONTENT_ROOT` is unset or
 * empty, this throws immediately rather than silently falling back
 * to a conventional location such as "./content" — a wrong or
 * accidental content root is exactly the kind of failure that must
 * be loud, not quietly wrong.
 *
 * This module only exposes configuration: it does not read the
 * filesystem, does not check whether the path exists, and does not
 * know anything about journals, Markdown, or Git.
 */
export function getJournalContentRoot(): string {
    const rawValue = process.env[JOURNAL_CONTENT_ROOT_ENV_VAR];
    const contentRoot = rawValue?.trim();

    if (!contentRoot) {
        throw new Error(
            `Missing required environment variable "${JOURNAL_CONTENT_ROOT_ENV_VAR}". ` +
                "This application requires an explicit content root and does not fall back " +
                "to a default location such as \"./content\". Set " +
                `${JOURNAL_CONTENT_ROOT_ENV_VAR} to the filesystem path of the journal content ` +
                "repository before starting the application."
        );
    }

    return contentRoot;
}
