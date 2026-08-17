import { GitHubApiError } from "./errors";

const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

/**
 * Runs one authenticated call against GitHub's REST API. Every function
 * in this module goes through here, so the auth header and request
 * shape live in exactly one place.
 *
 * Deliberately does not interpret the response's status code beyond
 * mapping a 5xx into GitHubApiError — callers each have their own
 * expected 4xx branches (404 means "missing" on a read, 409/422 means
 * "conflict" on a write) and are better placed to decide what a given
 * status means for that specific call than a shared helper would be.
 */
export async function githubApiRequest(token: string, path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
    });

    if (response.status >= 500) {
        throw new GitHubApiError(response.status, path, `GitHub API returned ${response.status} for ${path}`);
    }

    return response;
}
