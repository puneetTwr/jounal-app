import { afterEach, describe, expect, it } from "vitest";
import { gitBackupService } from "../GitBackupService";
import { gitRestoreService } from "../GitRestoreService";

/**
 * Confirms Backup/Restore fail closed on the github-api storage backend
 * (see ADR-002, VERCEL_IMPLEMENTATION_PLAN.md Phase 5) — not just that
 * the UI hides the buttons, but that a direct call to either service
 * (as a Server Action bypassing the UI would do) can't run a Git
 * operation that doesn't apply in that mode.
 */

function clearEnv(): void {
    delete process.env.JOURNAL_STORAGE_BACKEND;
    delete process.env.JOURNAL_CONTENT_GIT_REMOTE_URL;
    delete process.env.JOURNAL_CONTENT_GIT_TOKEN;
}

afterEach(() => {
    clearEnv();
});

describe("gitBackupService.isConfigured", () => {
    it("is false on the filesystem backend with no Git vars set", () => {
        clearEnv();
        expect(gitBackupService.isConfigured()).toBe(false);
    });

    it("is true on the filesystem backend with both Git vars set", () => {
        clearEnv();
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";
        expect(gitBackupService.isConfigured()).toBe(true);
    });

    it("is false on the github-api backend even though the same Git vars are set", () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "github-api";
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";
        expect(gitBackupService.isConfigured()).toBe(false);
    });
});

describe("backup()/restore() on the github-api backend", () => {
    it("backup() returns not-configured without touching git", async () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "github-api";
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";

        await expect(gitBackupService.backup()).resolves.toEqual({ status: "not-configured" });
    });

    it("restore() returns not-configured without touching git", async () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "github-api";
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";

        await expect(gitRestoreService.restore()).resolves.toEqual({ status: "not-configured" });
    });
});
