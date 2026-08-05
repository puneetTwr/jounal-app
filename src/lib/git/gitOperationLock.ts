/** Thrown by withGitLock() when another Git operation is already running. */
export class GitOperationInProgressError extends Error {
    constructor() {
        super("Another Git operation is already in progress.");
        this.name = "GitOperationInProgressError";
        Object.freeze(this);
    }
}

let isRunning = false;

/**
 * Serializes Backup and Restore against each other: both mutate the
 * same content-root working tree and index, so two running at once
 * could corrupt it. This is a single in-process flag — proportionate
 * for a single-user, single-server-process app; it does not need to
 * coordinate across machines or processes.
 */
export async function withGitLock<T>(operation: () => Promise<T>): Promise<T> {
    if (isRunning) {
        throw new GitOperationInProgressError();
    }

    isRunning = true;

    try {
        return await operation();
    } finally {
        isRunning = false;
    }
}
