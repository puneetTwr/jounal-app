import { getGitBackupConfig } from "@/lib/config";
import {
    commitAllChanges,
    fetchFromRemote,
    GitOperationInProgressError,
    hasUncommittedChanges,
    initRepository,
    isGitRepository,
    mergeRemoteBranch,
    setRemoteUrl,
    stageAllChanges,
    withGitLock,
} from "@/lib/git";
import { getContentRootPath } from "@/lib/paths";

const RESTORE_BRANCH = "main";

export type GitRestoreResult =
    | { status: "not-configured" }
    | { status: "in-progress" }
    | { status: "up-to-date" }
    | { status: "success" }
    | { status: "conflict" }
    | { status: "error" };

function buildSnapshotCommitMessage(): string {
    return `Pre-restore snapshot: ${new Date().toISOString()}`;
}

/**
 * Application-level use case behind the "Restore from Git" button:
 * pulls the content root's Git history down from the configured remote
 * and merges it into the local working tree.
 *
 * Any uncommitted local changes are committed locally first (not
 * pushed) so the merge always has a clean tree to work with and
 * nothing on disk is ever silently discarded by it — see
 * docs/git-restore-plan.md for the full reasoning. A genuine
 * same-file conflict aborts the merge immediately rather than leaving
 * conflict markers in a journal entry; the caller sees "conflict" and
 * the working tree is left exactly as it was before this ran.
 */
export interface GitRestoreService {
    /** Runs one full restore cycle. Never throws — failures are reported via the returned status. */
    restore(): Promise<GitRestoreResult>;
}

export const gitRestoreService: GitRestoreService = {
    restore: async () => {
        const config = getGitBackupConfig();
        if (!config) {
            return { status: "not-configured" };
        }

        const contentRoot = getContentRootPath();

        try {
            return await withGitLock(async () => {
                if (!isGitRepository(contentRoot)) {
                    await initRepository(contentRoot);
                }
                await setRemoteUrl(contentRoot, config.remoteUrl);

                if (await hasUncommittedChanges(contentRoot)) {
                    await stageAllChanges(contentRoot);
                    await commitAllChanges(contentRoot, buildSnapshotCommitMessage());
                }

                await fetchFromRemote(contentRoot, config.token);
                const outcome = await mergeRemoteBranch(contentRoot, RESTORE_BRANCH);

                if (outcome === "conflict") {
                    return { status: "conflict" };
                }

                return { status: outcome === "merged" ? "success" : "up-to-date" };
            });
        } catch (error) {
            if (error instanceof GitOperationInProgressError) {
                return { status: "in-progress" };
            }

            console.error("Git restore failed:", error);
            return { status: "error" };
        }
    },
};
