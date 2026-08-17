import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFile } from "../deleteFile";
import { GitHubApiError, GitHubConflictError } from "../errors";
import { getBlob } from "../getBlob";
import { getFileContent } from "../getFileContent";
import { getTree } from "../getTree";
import { putFile } from "../putFile";
import type { GithubApiContext } from "../types";

const context: GithubApiContext = { owner: "someone", repo: "my-journal-content", branch: "main", token: "ghp_example" };

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getFileContent", () => {
    it("returns null on 404", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }));

        expect(await getFileContent(context, "journals/missing.md")).toBeNull();
    });

    it("decodes content and returns the sha on 200", async () => {
        const encoded = Buffer.from("hello world", "utf-8").toString("base64");
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { content: encoded, sha: "abc123", type: "file" }));

        expect(await getFileContent(context, "journals/present.md")).toEqual({ content: "hello world", sha: "abc123" });
    });

    it("throws GitHubApiError on an unexpected status", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(403, { message: "Forbidden" }));

        await expect(getFileContent(context, "journals/x.md")).rejects.toBeInstanceOf(GitHubApiError);
    });
});

describe("putFile", () => {
    it("returns the new sha on success", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(201, { content: { sha: "new-sha" } }));

        const result = await putFile(context, "journals/x.md", "content", "Create x");

        expect(result).toEqual({ sha: "new-sha" });
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("/repos/someone/my-journal-content/contents/journals/x.md"),
            expect.objectContaining({ method: "PUT" })
        );
    });

    it("throws GitHubConflictError on 409", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(409, { message: "Conflict" }));

        await expect(putFile(context, "journals/x.md", "content", "Update x", "stale-sha")).rejects.toBeInstanceOf(
            GitHubConflictError
        );
    });

    it("throws GitHubConflictError on 422 (GitHub's actual sha-mismatch status)", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(422, { message: "sha does not match" }));

        await expect(putFile(context, "journals/x.md", "content", "Update x", "stale-sha")).rejects.toBeInstanceOf(
            GitHubConflictError
        );
    });
});

describe("deleteFile", () => {
    it("succeeds on 200", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { commit: {} }));

        await expect(deleteFile(context, "journals/x.md", "Delete x", "sha1")).resolves.toBeUndefined();
    });

    it("throws GitHubConflictError on 409", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(409, { message: "Conflict" }));

        await expect(deleteFile(context, "journals/x.md", "Delete x", "stale-sha")).rejects.toBeInstanceOf(GitHubConflictError);
    });
});

describe("getTree", () => {
    it("filters to blobs under the given prefix", async () => {
        fetchMock.mockResolvedValueOnce(
            jsonResponse(200, {
                truncated: false,
                tree: [
                    { path: "journals/a.md", sha: "sha-a", type: "blob" },
                    { path: "journals/b.md", sha: "sha-b", type: "blob" },
                    { path: "templates/c.md", sha: "sha-c", type: "blob" },
                    { path: "journals", sha: "sha-dir", type: "tree" },
                ],
            })
        );

        expect(await getTree(context, "journals")).toEqual([
            { path: "journals/a.md", sha: "sha-a" },
            { path: "journals/b.md", sha: "sha-b" },
        ]);
    });

    it("returns an empty list on 404 (unborn branch)", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Not Found" }));

        expect(await getTree(context, "journals")).toEqual([]);
    });

    it("throws when GitHub reports the tree as truncated", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { truncated: true, tree: [] }));

        await expect(getTree(context, "journals")).rejects.toBeInstanceOf(GitHubApiError);
    });
});

describe("getBlob", () => {
    it("decodes base64 blob content", async () => {
        const encoded = Buffer.from("entry body", "utf-8").toString("base64");
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { content: encoded }));

        expect(await getBlob(context, "sha-a")).toBe("entry body");
    });
});
