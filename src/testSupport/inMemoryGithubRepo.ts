interface FakeFile {
    content: string;
    sha: string;
}

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status });
}

async function readJsonBody(init: RequestInit | undefined): Promise<Record<string, unknown>> {
    return init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
}

/**
 * A stateful, in-memory stand-in for GitHub's Git Data/Contents API,
 * used to run the same repository contract tests against
 * `githubJournalRepository`/`githubTemplateRepository` that run against
 * the filesystem adapter — without a live GitHub repository. Tracks
 * files by content-repository-relative path (e.g. "journals/<id>.md"),
 * generating a new sha on every write so update/delete's
 * optimistic-concurrency checks behave the same way GitHub's real API
 * does: a stale sha is rejected, a matching one succeeds.
 *
 * Implements only the endpoints `src/lib/githubApi` actually calls
 * (recursive tree, blob-by-sha, contents get/put/delete) — not a
 * general GitHub API mock.
 */
export function createInMemoryGithubRepo() {
    const files = new Map<string, FakeFile>();
    let shaCounter = 0;
    const nextSha = () => `fake-sha-${++shaCounter}`;

    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";

        if (/^\/repos\/[^/]+\/[^/]+\/git\/trees\/[^/]+$/.test(url.pathname) && method === "GET") {
            const tree = Array.from(files.entries()).map(([path, file]) => ({ path, sha: file.sha, type: "blob" }));
            return jsonResponse(200, { truncated: false, tree });
        }

        const blobMatch = /^\/repos\/[^/]+\/[^/]+\/git\/blobs\/(.+)$/.exec(url.pathname);
        if (blobMatch && method === "GET") {
            const match = Array.from(files.values()).find((file) => file.sha === blobMatch[1]);
            if (!match) {
                return jsonResponse(404, { message: "Not Found" });
            }
            return jsonResponse(200, { content: Buffer.from(match.content, "utf-8").toString("base64") });
        }

        const contentsMatch = /^\/repos\/[^/]+\/[^/]+\/contents\/(.+)$/.exec(url.pathname);
        if (contentsMatch) {
            const path = decodeURIComponent(contentsMatch[1]);
            const existing = files.get(path);

            if (method === "GET") {
                if (!existing) {
                    return jsonResponse(404, { message: "Not Found" });
                }
                return jsonResponse(200, {
                    content: Buffer.from(existing.content, "utf-8").toString("base64"),
                    sha: existing.sha,
                    type: "file",
                });
            }

            if (method === "PUT") {
                const body = await readJsonBody(init);
                const providedSha = body.sha as string | undefined;

                if (existing && existing.sha !== providedSha) {
                    return jsonResponse(409, { message: "sha does not match" });
                }
                if (!existing && providedSha) {
                    return jsonResponse(422, { message: "sha given but file does not exist" });
                }

                const sha = nextSha();
                files.set(path, { content: Buffer.from(body.content as string, "base64").toString("utf-8"), sha });
                return jsonResponse(existing ? 200 : 201, { content: { sha } });
            }

            if (method === "DELETE") {
                const body = await readJsonBody(init);
                if (!existing) {
                    return jsonResponse(404, { message: "Not Found" });
                }
                if (existing.sha !== body.sha) {
                    return jsonResponse(409, { message: "sha does not match" });
                }
                files.delete(path);
                return jsonResponse(200, { commit: {} });
            }
        }

        return jsonResponse(404, { message: "Not Found" });
    }) as typeof fetch;

    return { fetchImpl, files };
}
