import { getGitBackupConfig, getStorageBackend } from "@/lib/config";
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
    /**
     * Whether Backup to Git is both applicable and configured: the
     * active storage backend has a separate local working tree for it
     * to operate on (i.e. "filesystem", not "github-api" — see
     * ADR-002), and both required env vars are set. Lets the UI show a
     * clear "not configured" state without attempting a backup.
     */
    isConfigured(): boolean;

    /** Runs one full backup cycle. Never throws — failures are reported via the returned status. */
    backup(): Promise<GitBackupResult>;
}

export const gitBackupService: GitBackupService = {
    isConfigured: () => getStorageBackend() === "filesystem" && getGitBackupConfig() !== null,

    backup: async () => {
        // On the github-api storage backend, every write already lands as
        // a commit — there is no separate local working tree left for
        // this feature to stage/push. Fails closed here too, not just by
        // hiding the button, so a direct call to this Server Action can't
        // bypass the UI gate (see ADR-002, VERCEL_IMPLEMENTATION_PLAN.md
        // Phase 5).
        if (getStorageBackend() !== "filesystem") {
            return { status: "not-configured" };
        }

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
