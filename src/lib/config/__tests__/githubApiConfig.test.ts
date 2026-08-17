import { afterEach, describe, expect, it } from "vitest";
import { getGithubApiStorageConfig } from "../githubApiConfig";

function clearEnv(): void {
    delete process.env.JOURNAL_CONTENT_GIT_REMOTE_URL;
    delete process.env.JOURNAL_CONTENT_GIT_TOKEN;
}

afterEach(() => {
    clearEnv();
});

describe("getGithubApiStorageConfig", () => {
    it("throws when the Git remote/token aren't set", () => {
        clearEnv();
        expect(() => getGithubApiStorageConfig()).toThrow(/requires/);
    });

    it("parses owner/repo from a .git-suffixed HTTPS remote", () => {
        clearEnv();
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";

        expect(getGithubApiStorageConfig()).toEqual({
            owner: "someone",
            repo: "my-journal-content",
            branch: "main",
            token: "ghp_example",
        });
    });

    it("parses owner/repo from a remote URL with no .git suffix", () => {
        clearEnv();
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";

        expect(getGithubApiStorageConfig().repo).toBe("my-journal-content");
    });

    it("throws on a non-GitHub or SSH remote URL", () => {
        clearEnv();
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "git@github.com:someone/my-journal-content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";

        expect(() => getGithubApiStorageConfig()).toThrow(/not a supported GitHub HTTPS remote URL/);
    });
});
