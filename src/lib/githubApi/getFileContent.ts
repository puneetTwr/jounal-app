import { GitHubApiError } from "./errors";
import { githubApiRequest } from "./request";
import type { GithubApiContext } from "./types";

interface GitHubContentsResponse {
    content: string;
    sha: string;
    type: string;
}

export interface GithubFileContent {
    content: string;
    sha: string;
}

/**
 * Fetches one file's decoded content and current blob `sha` via the
 * Contents API, or null if it doesn't exist — mirrors the filesystem
 * adapter's getEntry()/getTemplate() "missing means null, not an error"
 * contract, so the Service layer above doesn't need to know which
 * backend is active.
 */
export async function getFileContent(context: GithubApiContext, path: string): Promise<GithubFileContent | null> {
    const response = await githubApiRequest(
        context.token,
        `/repos/${context.owner}/${context.repo}/contents/${path}?ref=${encodeURIComponent(context.branch)}`
    );

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new GitHubApiError(response.status, path, `Failed to fetch "${path}": GitHub returned ${response.status}`);
    }

    const body = (await response.json()) as GitHubContentsResponse;

    if (body.type !== "file") {
        throw new GitHubApiError(response.status, path, `Expected "${path}" to be a file, got "${body.type}".`);
    }

    return { content: Buffer.from(body.content, "base64").toString("utf-8"), sha: body.sha };
}
