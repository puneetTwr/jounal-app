import type { JournalEntry } from "../types";

/**
 * Persistence contract for journal entries. Implementations compose the
 * filesystem, markdown, mapper, and validation layers; nothing outside
 * this repository is permitted to know how a JournalEntry is stored on
 * disk.
 */
export interface JournalRepository {
    /** Lists every journal entry found in the journals directory. */
    listEntries(): Promise<JournalEntry[]>;

    /** Returns the entry with the given id, or null if none exists. */
    getEntry(id: string): Promise<JournalEntry | null>;

    /** Persists a new entry. Throws if an entry with the same id already exists. */
    createEntry(entry: JournalEntry): Promise<void>;

    /** Overwrites an existing entry. Throws if no entry with that id exists yet. */
    updateEntry(entry: JournalEntry): Promise<void>;

    /** Deletes the entry with the given id. Throws if no such entry exists. */
    deleteEntry(id: string): Promise<void>;
}
