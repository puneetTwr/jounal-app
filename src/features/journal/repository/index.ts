import { createEntry } from "./createEntry";
import { deleteEntry } from "./deleteEntry";
import { getEntry } from "./getEntry";
import type { JournalRepository } from "./JournalRepository";
import { listEntries } from "./listEntries";
import { updateEntry } from "./updateEntry";

export type { JournalRepository } from "./JournalRepository";

/**
 * Filesystem-backed implementation of JournalRepository, composing the
 * filesystem, markdown, mapper, and validation layers. This is the only
 * module in the journal domain permitted to know about those layers.
 */
export const journalRepository: JournalRepository = {
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
};
