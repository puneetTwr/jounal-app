import { journalRepository } from "../repository";
import type { JournalEntry } from "../types";

/**
 * Application-level use cases for working with journal entries.
 *
 * This is the only layer Server Actions are permitted to call directly
 * — Server Actions must never import the Journal Repository
 * themselves. JournalService knows nothing about React, Next.js, the
 * filesystem, Markdown, or paths; it only composes the Journal
 * Repository.
 *
 * Every method here currently delegates straight through to the
 * repository, unchanged. That is deliberate: the purpose of this layer
 * right now is to establish a stable boundary between Server Actions
 * and the Repository, so that future orchestration — automatic
 * timestamps, duplicate title handling, slug generation, applying
 * templates, a Git save workflow, attachment processing, analytics —
 * has a proper home without any Server Action ever needing to change.
 */
export interface JournalService {
    /** Lists every journal entry. */
    listJournals(): Promise<JournalEntry[]>;

    /** Returns the journal entry with the given id, or null if none exists. */
    getJournal(id: string): Promise<JournalEntry | null>;

    /** Creates a new journal entry. Throws if one with the same id already exists. */
    createJournal(entry: JournalEntry): Promise<void>;

    /** Overwrites an existing journal entry. Throws if none with that id exists yet. */
    updateJournal(entry: JournalEntry): Promise<void>;

    /** Deletes the journal entry with the given id. Throws if no such entry exists. */
    deleteJournal(id: string): Promise<void>;
}

export const journalService: JournalService = {
    listJournals: () => journalRepository.listEntries(),
    getJournal: (id) => journalRepository.getEntry(id),
    createJournal: (entry) => journalRepository.createEntry(entry),
    updateJournal: (entry) => journalRepository.updateEntry(entry),
    deleteJournal: (id) => journalRepository.deleteEntry(id),
};
