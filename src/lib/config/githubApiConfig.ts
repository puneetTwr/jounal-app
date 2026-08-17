import { getGitBackupConfig } from "./gitBackupConfig";

const GITHUB_HTTPS_REMOTE_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/;

/**
 * No dedicated "which branch" env var exists — the github-api storage
 * backend always reads/writes this branch. Matches the filesystem
 * backend's Git-backup feature, which already hardcodes `main` as its
 * push target.
 */
export const GITHUB_API_DEFAULT_BRANCH = "main";

export interface GithubApiStorageConfig {
    owner: string;
    repo: string;
    branch: string;
    token: string;
}

/**
 * Derives the GitHub API configuration (owner, repo, branch, token) from
 * the same `JOURNAL_CONTENT_GIT_REMOTE_URL` / `JOURNAL_CONTENT_GIT_TOKEN`
 * pair the filesystem backend's Git-backup feature already uses (see
 * ADR-002) — no separate owner/repo env vars exist, since the remote URL
 * is already the single source of truth for "where does journal content
 * live on GitHub."
 *
 * Throws if either var is missing (mirrors `getStorageBackend()`'s own
 * fail-fast check, so this is safe to call unconditionally once
 * `getStorageBackend()` has already resolved to "github-api") or if the
 * remote URL isn't a plain `https://github.com/<owner>/<repo>` URL — SSH
 * remotes, GitHub Enterprise hosts, and other Git providers aren't
 * supported by this backend, since it calls GitHub's public REST API
 * directly rather than a generic Git remote.
 */
export function getGithubApiStorageConfig(): GithubApiStorageConfig {
    const gitConfig = getGitBackupConfig();

    if (!gitConfig) {
        throw new Error(
            "GitHub API storage backend requires JOURNAL_CONTENT_GIT_REMOTE_URL and JOURNAL_CONTENT_GIT_TOKEN to be set."
        );
    }

    const match = GITHUB_HTTPS_REMOTE_PATTERN.exec(gitConfig.remoteUrl);

    if (!match) {
        throw new Error(
            `JOURNAL_CONTENT_GIT_REMOTE_URL "${gitConfig.remoteUrl}" is not a supported GitHub HTTPS remote URL ` +
                '(expected "https://github.com/<owner>/<repo>"). The github-api storage backend calls GitHub\'s ' +
                "REST API directly and only supports github.com HTTPS remotes."
        );
    }

    const [, owner, repo] = match;

    return { owner, repo, branch: GITHUB_API_DEFAULT_BRANCH, token: gitConfig.token };
}
