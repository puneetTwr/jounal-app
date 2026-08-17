import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInMemoryGithubRepo } from "@/testSupport/inMemoryGithubRepo";
import { JournalEntryAlreadyExistsError, JournalEntryNotFoundError, JournalValidationError } from "../../errors";
import type { JournalEntry } from "../../types";
import { filesystemJournalRepository } from "../filesystem";
import { githubJournalRepository } from "../githubApi";
import type { JournalRepository } from "../JournalRepository";

/**
 * Runs the same behavioral contract against both JournalRepository
 * implementations — the filesystem adapter (against a real temp
 * directory) and the GitHub API adapter (against an in-memory GitHub
 * fake, see @/testSupport/inMemoryGithubRepo) — so the two can never
 * silently drift apart in what they guarantee to JournalService. See
 * ADR-002.
 */

function buildEntry(overrides: Partial<JournalEntry["frontMatter"]> = {}): JournalEntry {
    const now = new Date().toISOString();

    return {
        frontMatter: {
            version: 1,
            id: randomUUID(),
            title: "Contract test entry",
            journalDate: "2026-08-17",
            createdAt: now,
            updatedAt: now,
            tags: [],
            favorite: false,
            pinned: false,
            archived: false,
            ...overrides,
        },
        content: "Body",
    };
}

interface Adapter {
    name: string;
    repository: JournalRepository;
    setUp: () => Promise<void> | void;
    tearDown: () => Promise<void> | void;
}

let filesystemTempDir = "";

const adapters: Adapter[] = [
    {
        name: "filesystem",
        repository: filesystemJournalRepository,
        setUp: async () => {
            filesystemTempDir = await mkdtemp(join(tmpdir(), "journal-contract-"));
            await mkdir(join(filesystemTempDir, "journals"), { recursive: true });
            process.env.JOURNAL_CONTENT_ROOT = filesystemTempDir;
        },
        tearDown: async () => {
            delete process.env.JOURNAL_CONTENT_ROOT;
            await rm(filesystemTempDir, { recursive: true, force: true });
        },
    },
    {
        name: "github-api",
        repository: githubJournalRepository,
        setUp: () => {
            vi.stubGlobal("fetch", createInMemoryGithubRepo().fetchImpl);
            process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
            process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";
        },
        tearDown: () => {
            vi.unstubAllGlobals();
            delete process.env.JOURNAL_CONTENT_GIT_REMOTE_URL;
            delete process.env.JOURNAL_CONTENT_GIT_TOKEN;
        },
    },
];

describe.each(adapters)("JournalRepository contract — $name", ({ repository, setUp, tearDown }) => {
    beforeEach(setUp);
    afterEach(tearDown);

    it("getEntry returns null for a nonexistent id", async () => {
        expect(await repository.getEntry(randomUUID())).toBeNull();
    });

    it("creates, reads, updates, and deletes an entry, reflected in getEntry and listEntries at every step", async () => {
        const entry = buildEntry();

        await repository.createEntry(entry);
        expect((await repository.getEntry(entry.frontMatter.id))?.frontMatter.title).toBe("Contract test entry");
        expect((await repository.listEntries()).map((e) => e.frontMatter.id)).toContain(entry.frontMatter.id);

        const updated: JournalEntry = { ...entry, frontMatter: { ...entry.frontMatter, title: "Updated title" } };
        await repository.updateEntry(updated);
        expect((await repository.getEntry(entry.frontMatter.id))?.frontMatter.title).toBe("Updated title");

        await repository.deleteEntry(entry.frontMatter.id);
        expect(await repository.getEntry(entry.frontMatter.id)).toBeNull();
        expect((await repository.listEntries()).map((e) => e.frontMatter.id)).not.toContain(entry.frontMatter.id);
    });

    it("createEntry throws JournalEntryAlreadyExistsError on a duplicate id", async () => {
        const entry = buildEntry();
        await repository.createEntry(entry);

        await expect(repository.createEntry(entry)).rejects.toBeInstanceOf(JournalEntryAlreadyExistsError);
    });

    it("updateEntry throws JournalEntryNotFoundError for a nonexistent id", async () => {
        await expect(repository.updateEntry(buildEntry())).rejects.toBeInstanceOf(JournalEntryNotFoundError);
    });

    it("deleteEntry throws JournalEntryNotFoundError for a nonexistent id", async () => {
        await expect(repository.deleteEntry(randomUUID())).rejects.toBeInstanceOf(JournalEntryNotFoundError);
    });

    it("createEntry throws JournalValidationError, and writes nothing, for an invalid entry", async () => {
        const invalid = buildEntry({ title: "" });

        await expect(repository.createEntry(invalid)).rejects.toBeInstanceOf(JournalValidationError);
        expect(await repository.getEntry(invalid.frontMatter.id)).toBeNull();
    });
});
