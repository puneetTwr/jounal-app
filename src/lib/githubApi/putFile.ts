import { GitHubApiError, GitHubConflictError } from "./errors";
import { githubApiRequest } from "./request";
import type { GithubApiContext } from "./types";

interface PutFileResponse {
    content: { sha: string };
}

export interface PutFileResult {
    sha: string;
}

/**
 * Creates or updates one file via the Contents API. Omitting `sha`
 * creates a new file (GitHub rejects it with a conflict if one already
 * exists at that path); providing the current `sha` updates it. A
 * stale or missing `sha` on an update surfaces as GitHubConflictError so
 * callers can refetch and retry, rather than silently overwriting
 * someone else's change or failing with an opaque generic error.
 */
export async function putFile(
    context: GithubApiContext,
    path: string,
    content: string,
    message: string,
    sha?: string
): Promise<PutFileResult> {
    const response = await githubApiRequest(context.token, `/repos/${context.owner}/${context.repo}/contents/${path}`, {
        method: "PUT",
        body: JSON.stringify({
            message,
            content: Buffer.from(content, "utf-8").toString("base64"),
            branch: context.branch,
            ...(sha ? { sha } : {}),
        }),
    });

    if (response.status === 409 || response.status === 422) {
        throw new GitHubConflictError(path);
    }

    if (!response.ok) {
        throw new GitHubApiError(response.status, path, `Failed to write "${path}": GitHub returned ${response.status}`);
    }

    const body = (await response.json()) as PutFileResponse;

    return { sha: body.content.sha };
}
