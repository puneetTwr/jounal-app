import {
    getGitBackupConfig,
    JOURNAL_CONTENT_GIT_REMOTE_URL_ENV_VAR,
    JOURNAL_CONTENT_GIT_TOKEN_ENV_VAR,
} from "./gitBackupConfig";

/** Env var name selecting which JournalRepository/TemplateRepository implementation is active. Named constant so the literal string appears exactly once. */
export const JOURNAL_STORAGE_BACKEND_ENV_VAR = "JOURNAL_STORAGE_BACKEND";

/**
 * Which JournalRepository/TemplateRepository implementation is active:
 * "filesystem" (Markdown files on local disk, the original architecture)
 * or "github-api" (reads/writes through GitHub's API instead, for hosts
 * with no persistent disk — see ADR-002).
 */
export type StorageBackend = "filesystem" | "github-api";

const VALID_STORAGE_BACKENDS: readonly StorageBackend[] = ["filesystem", "github-api"];

function isStorageBackend(value: string): value is StorageBackend {
    return (VALID_STORAGE_BACKENDS as readonly string[]).includes(value);
}

/**
 * Returns the active storage backend. Defaults to "filesystem" when
 * `JOURNAL_STORAGE_BACKEND` is unset, so every existing deployment and
 * every local `pnpm dev` run is unaffected by this variable's existence.
 *
 * An explicitly set but unrecognized value throws rather than silently
 * falling back — a typo here should never quietly mean "keep using the
 * filesystem" when the operator meant to switch backends.
 *
 * "github-api" additionally requires `JOURNAL_CONTENT_GIT_REMOTE_URL` and
 * `JOURNAL_CONTENT_GIT_TOKEN` to both be set and throws if either is
 * missing: in this mode they identify the *only* place journal content
 * lives, not optional Git-backup configuration, so a missing value here
 * must fail loudly rather than leave the app with nowhere to read from.
 */
export function getStorageBackend(): StorageBackend {
    const rawValue = process.env[JOURNAL_STORAGE_BACKEND_ENV_VAR]?.trim();

    if (!rawValue) {
        return "filesystem";
    }

    if (!isStorageBackend(rawValue)) {
        throw new Error(
            `Invalid value for environment variable "${JOURNAL_STORAGE_BACKEND_ENV_VAR}": "${rawValue}". ` +
                `Expected one of ${VALID_STORAGE_BACKENDS.map((backend) => `"${backend}"`).join(" or ")}.`
        );
    }

    if (rawValue === "github-api" && !getGitBackupConfig()) {
        throw new Error(
            `${JOURNAL_STORAGE_BACKEND_ENV_VAR}="github-api" requires both ` +
                `${JOURNAL_CONTENT_GIT_REMOTE_URL_ENV_VAR} and ${JOURNAL_CONTENT_GIT_TOKEN_ENV_VAR} to be set. ` +
                "In this mode they identify the only place journal content lives, not optional Git-backup configuration."
        );
    }

    return rawValue;
}
