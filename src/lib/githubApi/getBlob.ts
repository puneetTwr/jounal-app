import { GitHubApiError } from "./errors";
import { githubApiRequest } from "./request";
import type { GithubApiContext } from "./types";

interface GitBlobResponse {
    content: string;
}

/** Fetches and decodes one blob's text content by its sha (as returned by getTree()). */
export async function getBlob(context: GithubApiContext, sha: string): Promise<string> {
    const response = await githubApiRequest(context.token, `/repos/${context.owner}/${context.repo}/git/blobs/${sha}`);

    if (!response.ok) {
        throw new GitHubApiError(response.status, `git/blobs/${sha}`, `Failed to fetch blob "${sha}": GitHub returned ${response.status}`);
    }

    const body = (await response.json()) as GitBlobResponse;

    return Buffer.from(body.content, "base64").toString("utf-8");
}
