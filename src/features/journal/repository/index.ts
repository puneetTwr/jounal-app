import { getStorageBackend } from "@/lib/config";
import { filesystemJournalRepository } from "./filesystem";
import { githubJournalRepository } from "./githubApi";
import type { JournalRepository } from "./JournalRepository";

export type { JournalRepository } from "./JournalRepository";

/**
 * The active JournalRepository implementation, selected once at module
 * load by JOURNAL_STORAGE_BACKEND (see ADR-002): the original
 * filesystem-backed implementation, or the GitHub-API-backed one used
 * for hosts with no persistent disk. Everything above this layer
 * (JournalService, Server Actions, UI) depends only on the
 * JournalRepository interface and never knows — or needs to know —
 * which one is active.
 */
export const journalRepository: JournalRepository =
    getStorageBackend() === "github-api" ? githubJournalRepository : filesystemJournalRepository;
