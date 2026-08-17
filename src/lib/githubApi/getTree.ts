import { GitHubApiError } from "./errors";
import { githubApiRequest } from "./request";
import type { GithubApiContext } from "./types";

interface GitTreeEntry {
    path: string;
    sha: string;
    type: string;
}

interface GitTreeResponse {
    tree: GitTreeEntry[];
    truncated: boolean;
}

/**
 * Lists every blob (file) under `directoryPrefix` (e.g. "journals") in
 * one call, via the Git Data API's recursive tree endpoint — avoids one
 * Contents-API round trip per file just to enumerate what exists.
 *
 * Throws if GitHub reports the tree as `truncated` (a repository too
 * large for one recursive call) rather than silently returning a partial
 * listing — for a journal, "some entries missing from the list" would
 * look exactly like data loss.
 */
export async function getTree(
    context: GithubApiContext,
    directoryPrefix: string
): Promise<Array<{ path: string; sha: string }>> {
    const response = await githubApiRequest(
        context.token,
        `/repos/${context.owner}/${context.repo}/git/trees/${encodeURIComponent(context.branch)}?recursive=1`
    );

    if (response.status === 404) {
        // Unborn/empty branch — nothing has ever been committed yet, so there's nothing to list.
        return [];
    }

    if (!response.ok) {
        throw new GitHubApiError(
            response.status,
            "git/trees",
            `Failed to list "${directoryPrefix}": GitHub returned ${response.status}`
        );
    }

    const body = (await response.json()) as GitTreeResponse;

    if (body.truncated) {
        throw new GitHubApiError(
            response.status,
            "git/trees",
            `GitHub truncated the tree listing for ${context.owner}/${context.repo} — the repository is too large for a single recursive tree call.`
        );
    }

    const prefix = `${directoryPrefix}/`;

    return body.tree
        .filter((entry) => entry.type === "blob" && entry.path.startsWith(prefix))
        .map((entry) => ({ path: entry.path, sha: entry.sha }));
}
