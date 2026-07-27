import type { JournalFrontMatter } from "./types";

/**
 * The current journal front matter schema version. Every JournalEntry
 * created by this application is stamped with this value, so that a
 * future schema change has something concrete to migrate away from.
 */
export const JOURNAL_SCHEMA_VERSION: JournalFrontMatter["version"] = 1;

/**
 * The canonical order in which front matter keys should appear.
 * Typed against `keyof JournalFrontMatter` so this list cannot drift
 * out of sync with the JournalFrontMatter interface without a
 * compiler error.
 */
export const JOURNAL_FRONT_MATTER_KEY_ORDER: ReadonlyArray<keyof JournalFrontMatter> = [
    "version",
    "id",
    "title",
    "journalDate",
    "createdAt",
    "updatedAt",
    "tags",
    "favorite",
    "pinned",
    "archived",
];

/** Default value for a journal entry's tags when none are provided. */
export const DEFAULT_JOURNAL_TAGS: ReadonlyArray<string> = [];

/** Default value for a journal entry's favorite flag. */
export const DEFAULT_JOURNAL_FAVORITE = false;

/** Default value for a journal entry's pinned flag. */
export const DEFAULT_JOURNAL_PINNED = false;

/** Default value for a journal entry's archived flag. */
export const DEFAULT_JOURNAL_ARCHIVED = false;
