/** An unexpected (non-2xx, not a recognized "expected" status like 404 on a read) response from GitHub's API. */
export class GitHubApiError extends Error {
    constructor(
        public readonly status: number,
        public readonly path: string,
        message: string
    ) {
        super(message);
        this.name = "GitHubApiError";
    }
}

/**
 * Thrown when a write (putFile/deleteFile) is rejected because the
 * provided `sha` no longer matches the file's current state on GitHub —
 * someone else (another request, another device) changed or deleted it
 * since it was last read. Callers should refetch the current `sha` and
 * retry once before surfacing this as a real conflict.
 */
export class GitHubConflictError extends GitHubApiError {
    constructor(path: string) {
        super(409, path, `GitHub rejected the write to "${path}" — the file changed since it was last read.`);
        this.name = "GitHubConflictError";
    }
}
