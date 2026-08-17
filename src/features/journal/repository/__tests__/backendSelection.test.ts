import { afterEach, describe, expect, it, vi } from "vitest";

function clearEnv(): void {
    delete process.env.JOURNAL_STORAGE_BACKEND;
    delete process.env.JOURNAL_CONTENT_GIT_REMOTE_URL;
    delete process.env.JOURNAL_CONTENT_GIT_TOKEN;
}

afterEach(() => {
    clearEnv();
    vi.resetModules();
});

describe("journalRepository backend selection", () => {
    it("wires the filesystem implementation by default", async () => {
        clearEnv();
        vi.resetModules();

        const { journalRepository } = await import("../index");
        const { filesystemJournalRepository } = await import("../filesystem");

        expect(journalRepository).toBe(filesystemJournalRepository);
    });

    it("wires the GitHub API implementation when JOURNAL_STORAGE_BACKEND=github-api", async () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "github-api";
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";
        vi.resetModules();

        const { journalRepository } = await import("../index");
        const { githubJournalRepository } = await import("../githubApi");

        expect(journalRepository).toBe(githubJournalRepository);
    });
});
