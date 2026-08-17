import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalEntryAlreadyExistsError, JournalEntryNotFoundError } from "../../../errors";
import type { JournalEntry } from "../../../types";
import { createEntry } from "../createEntry";
import { deleteEntry } from "../deleteEntry";
import { getEntry } from "../getEntry";
import { listEntries } from "../listEntries";
import { updateEntry } from "../updateEntry";

const ENTRY_ID = "b7a1c1a0-1f2e-4c3d-9a8b-0c1d2e3f4a5b";

function buildEntry(overrides: Partial<JournalEntry["frontMatter"]> = {}): JournalEntry {
    return {
        frontMatter: {
            version: 1,
            id: ENTRY_ID,
            title: "Test entry",
            journalDate: "2026-08-17",
            createdAt: "2026-08-17T00:00:00.000Z",
            updatedAt: "2026-08-17T00:00:00.000Z",
            tags: [],
            favorite: false,
            pinned: false,
            archived: false,
            ...overrides,
        },
        content: "Hello world",
    };
}

function toMarkdown(entry: JournalEntry): string {
    return [
        "---",
        `version: ${entry.frontMatter.version}`,
        `id: ${entry.frontMatter.id}`,
        `title: ${entry.frontMatter.title}`,
        `journalDate: '${entry.frontMatter.journalDate}'`,
        `createdAt: '${entry.frontMatter.createdAt}'`,
        `updatedAt: '${entry.frontMatter.updatedAt}'`,
        "tags: []",
        `favorite: ${entry.frontMatter.favorite}`,
        `pinned: ${entry.frontMatter.pinned}`,
        `archived: ${entry.frontMatter.archived}`,
        "---",
        entry.content,
        "",
    ].join("\n");
}

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.JOURNAL_CONTENT_GIT_REMOTE_URL = "https://github.com/someone/my-journal-content.git";
    process.env.JOURNAL_CONTENT_GIT_TOKEN = "ghp_example";
});

afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JOURNAL_CONTENT_GIT_REMOTE_URL;
    delete process.env.JOURNAL_CONTENT_GIT_TOKEN;
});

describe("getEntry", () => {
    it("returns null when the file doesn't exist", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }));

        expect(await getEntry(ENTRY_ID)).toBeNull();
    });

    it("returns the parsed entry when the file exists", async () => {
        const entry = buildEntry();
        const encoded = Buffer.from(toMarkdown(entry), "utf-8").toString("base64");
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { content: encoded, sha: "sha-1", type: "file" }));

        const result = await getEntry(ENTRY_ID);
        expect(result?.frontMatter.id).toBe(ENTRY_ID);
        expect(result?.frontMatter.title).toBe("Test entry");
        expect(result?.content.trim()).toBe("Hello world");
    });
});

describe("listEntries", () => {
    it("fetches the tree once, then one blob per file", async () => {
        const entry = buildEntry();
        const encoded = Buffer.from(toMarkdown(entry), "utf-8").toString("base64");

        fetchMock
            .mockResolvedValueOnce(
                jsonResponse(200, { truncated: false, tree: [{ path: `journals/${ENTRY_ID}.md`, sha: "sha-1", type: "blob" }] })
            )
            .mockResolvedValueOnce(jsonResponse(200, { content: encoded }));

        const entries = await listEntries();
        expect(entries).toHaveLength(1);
        expect(entries[0].frontMatter.id).toBe(ENTRY_ID);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

describe("createEntry", () => {
    it("throws JournalEntryAlreadyExistsError when the path already has a file", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { content: "", sha: "sha-1", type: "file" }));

        await expect(createEntry(buildEntry())).rejects.toBeInstanceOf(JournalEntryAlreadyExistsError);
    });

    it("writes the entry when the path is free", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }))
            .mockResolvedValueOnce(jsonResponse(201, { content: { sha: "new-sha" } }));

        await expect(createEntry(buildEntry())).resolves.toBeUndefined();

        const putCall = fetchMock.mock.calls[1];
        expect(putCall[1]).toMatchObject({ method: "PUT" });
    });
});

describe("updateEntry", () => {
    it("throws JournalEntryNotFoundError when the entry doesn't exist", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }));

        await expect(updateEntry(buildEntry())).rejects.toBeInstanceOf(JournalEntryNotFoundError);
    });

    it("retries once on a conflict, then succeeds with the refetched sha", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(200, { content: "", sha: "stale-sha", type: "file" })) // initial getFileContent
            .mockResolvedValueOnce(jsonResponse(409, { message: "Conflict" })) // first putFile attempt
            .mockResolvedValueOnce(jsonResponse(200, { content: "", sha: "fresh-sha", type: "file" })) // refetch
            .mockResolvedValueOnce(jsonResponse(200, { content: { sha: "final-sha" } })); // retried putFile

        await expect(updateEntry(buildEntry())).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });
});

describe("deleteEntry", () => {
    it("throws JournalEntryNotFoundError when the entry doesn't exist", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }));

        await expect(deleteEntry(ENTRY_ID)).rejects.toBeInstanceOf(JournalEntryNotFoundError);
    });

    it("deletes using the current sha", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(200, { content: "", sha: "sha-1", type: "file" }))
            .mockResolvedValueOnce(jsonResponse(200, { commit: {} }));

        await expect(deleteEntry(ENTRY_ID)).resolves.toBeUndefined();
    });
});
