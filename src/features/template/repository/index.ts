import { getStorageBackend } from "@/lib/config";
import { filesystemTemplateRepository } from "./filesystem";
import { githubTemplateRepository } from "./githubApi";
import type { TemplateRepository } from "./TemplateRepository";

export type { TemplateRepository } from "./TemplateRepository";

/**
 * The active TemplateRepository implementation, selected once at module
 * load by JOURNAL_STORAGE_BACKEND (see ADR-002) — same selection
 * JournalRepository uses, so both domains always agree on which backend
 * is active.
 */
export const templateRepository: TemplateRepository =
    getStorageBackend() === "github-api" ? githubTemplateRepository : filesystemTemplateRepository;
