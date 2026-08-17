import { createEntry } from "./createEntry";
import { deleteEntry } from "./deleteEntry";
import { getEntry } from "./getEntry";
import type { JournalRepository } from "../JournalRepository";
import { listEntries } from "./listEntries";
import { updateEntry } from "./updateEntry";

/**
 * GitHub-API-backed implementation of JournalRepository — reads and
 * writes journal content through GitHub's Git Data/Contents APIs
 * instead of a local disk, for hosts with no persistent filesystem
 * (e.g. Vercel). See ADR-002.
 */
export const githubJournalRepository: JournalRepository = {
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
};
