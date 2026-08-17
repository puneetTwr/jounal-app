import { GitHubApiError, GitHubConflictError } from "./errors";
import { githubApiRequest } from "./request";
import type { GithubApiContext } from "./types";

/** Deletes one file via the Contents API. Requires the file's current `sha` — the same optimistic-concurrency guard putFile() uses. */
export async function deleteFile(context: GithubApiContext, path: string, message: string, sha: string): Promise<void> {
    const response = await githubApiRequest(context.token, `/repos/${context.owner}/${context.repo}/contents/${path}`, {
        method: "DELETE",
        body: JSON.stringify({ message, sha, branch: context.branch }),
    });

    if (response.status === 409 || response.status === 422) {
        throw new GitHubConflictError(path);
    }

    if (!response.ok) {
        throw new GitHubApiError(response.status, path, `Failed to delete "${path}": GitHub returned ${response.status}`);
    }
}
