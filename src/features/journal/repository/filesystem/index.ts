import { createEntry } from "./createEntry";
import { deleteEntry } from "./deleteEntry";
import { getEntry } from "./getEntry";
import type { JournalRepository } from "../JournalRepository";
import { listEntries } from "./listEntries";
import { updateEntry } from "./updateEntry";

/**
 * Filesystem-backed implementation of JournalRepository, composing the
 * filesystem, markdown, mapper, and validation layers. This is the only
 * module in the journal domain permitted to know about those layers. The
 * original architecture (see ADR-001) and still the default — used by
 * local development and any host with a real persistent disk.
 */
export const filesystemJournalRepository: JournalRepository = {
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
};
