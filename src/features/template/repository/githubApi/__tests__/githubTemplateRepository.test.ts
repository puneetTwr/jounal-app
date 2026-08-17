import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTemplate } from "../getTemplate";
import { listTemplates } from "../listTemplates";

const TEMPLATE_ID = "c2b3d4e5-6f70-4819-9a2b-3c4d5e6f7081";

function templateMarkdown(): string {
    return [
        "---",
        "version: 1",
        `id: ${TEMPLATE_ID}`,
        "name: Daily Journal",
        "createdAt: '2026-08-17T00:00:00.000Z'",
        "updatedAt: '2026-08-17T00:00:00.000Z'",
        "tags: []",
        "---",
        "## {{title}}",
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

describe("getTemplate", () => {
    it("returns null when the file doesn't exist", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }));

        expect(await getTemplate(TEMPLATE_ID)).toBeNull();
    });

    it("returns the parsed template when the file exists", async () => {
        const encoded = Buffer.from(templateMarkdown(), "utf-8").toString("base64");
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { content: encoded, sha: "sha-1", type: "file" }));

        const result = await getTemplate(TEMPLATE_ID);
        expect(result?.frontMatter.id).toBe(TEMPLATE_ID);
        expect(result?.frontMatter.name).toBe("Daily Journal");
    });
});

describe("listTemplates", () => {
    it("fetches the tree once, then one blob per file", async () => {
        const encoded = Buffer.from(templateMarkdown(), "utf-8").toString("base64");

        fetchMock
            .mockResolvedValueOnce(
                jsonResponse(200, {
                    truncated: false,
                    tree: [{ path: `templates/${TEMPLATE_ID}.md`, sha: "sha-1", type: "blob" }],
                })
            )
            .mockResolvedValueOnce(jsonResponse(200, { content: encoded }));

        const entries = await listTemplates();
        expect(entries).toHaveLength(1);
        expect(entries[0].frontMatter.id).toBe(TEMPLATE_ID);
    });
});
