import { getGitBackupConfig } from "@/lib/config";
import {
    commitAllChanges,
    GitOperationInProgressError,
    hasUncommittedChanges,
    initRepository,
    isGitRepository,
    pushToRemote,
    setRemoteUrl,
    stageAllChanges,
    withGitLock,
} from "@/lib/git";
import { getContentRootPath } from "@/lib/paths";

const BACKUP_BRANCH = "main";

export type GitBackupResult =
    | { status: "not-configured" }
    | { status: "in-progress" }
    | { status: "nothing-to-backup" }
    | { status: "success" }
    | { status: "error" };

function buildBackupCommitMessage(): string {
    return `Journal backup: ${new Date().toISOString()}`;
}

/**
 * Application-level use case behind the "Backup to Git" button: makes
 * sure the content root is a Git repository pointed at the configured
 * remote, then stages, commits, and pushes every change since the last
 * backup in one shot.
 *
 * This is the only layer the Server Action is permitted to call
 * directly — it composes lib/git (the Git primitives) and lib/config
 * (env-var-backed configuration), the same Service boundary already
 * established for journals and templates.
 */
export interface GitBackupService {
    /** Whether both required env vars are set — lets the UI show a clear "not configured" state without attempting a backup. */
    isConfigured(): boolean;

    /** Runs one full backup cycle. Never throws — failures are reported via the returned status. */
    backup(): Promise<GitBackupResult>;
}

export const gitBackupService: GitBackupService = {
    isConfigured: () => getGitBackupConfig() !== null,

    backup: async () => {
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
                await stageAllChanges(contentRoot);

                if (!(await hasUncommittedChanges(contentRoot))) {
                    return { status: "nothing-to-backup" };
                }

                await commitAllChanges(contentRoot, buildBackupCommitMessage());
                await pushToRemote(contentRoot, BACKUP_BRANCH, config.token);

                return { status: "success" };
            });
        } catch (error) {
            if (error instanceof GitOperationInProgressError) {
                return { status: "in-progress" };
            }

            // Full detail (including git's stderr) stays server-side; the
            // UI only ever sees the generic "error" status, consistent
            // with how other Server Actions in this app avoid echoing
            // raw error text back to the client.
            console.error("Git backup failed:", error);
            return { status: "error" };
        }
    },
};
