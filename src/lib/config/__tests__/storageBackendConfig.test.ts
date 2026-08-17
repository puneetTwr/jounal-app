import { afterEach, describe, expect, it } from "vitest";
import { getStorageBackend } from "../storageBackendConfig";

const ENV_KEYS = ["JOURNAL_STORAGE_BACKEND", "JOURNAL_CONTENT_GIT_REMOTE_URL", "JOURNAL_CONTENT_GIT_TOKEN"] as const;

function clearEnv(): void {
    for (const key of ENV_KEYS) {
        delete process.env[key];
    }
}

afterEach(() => {
    clearEnv();
});

describe("getStorageBackend", () => {
    it("defaults to filesystem when unset", () => {
        clearEnv();
        expect(getStorageBackend()).toBe("filesystem");
    });

    it("resolves to filesystem when explicitly set", () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "filesystem";
        expect(getStorageBackend()).toBe("filesystem");
    });

    it("throws on an unrecognized value", () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "s3";
        expect(() => getStorageBackend()).toThrow(/Invalid value/);
    });

    it("throws when github-api is selected without the Git remote/token", () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "github-api";
        expect(() => getStorageBackend()).toThrow(/requires both/);
    });

    it("throws when github-api is selected with only one of the two vars set", () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "github-api";
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/example/content.git";
        expect(() => getStorageBackend()).toThrow(/requires both/);
    });

    it("resolves to github-api when both required vars are set", () => {
        clearEnv();
        process.env.JOURNAL_STORAGE_BACKEND = "github-api";
        process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/example/content.git";
        process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";
        expect(getStorageBackend()).toBe("github-api");
    });
});
