import { existsSync } from "node:fs";
import path from "node:path";
import { GitCommandError } from "./errors";
import { execGit } from "./execGit";

export type MergeOutcome = "up-to-date" | "merged" | "conflict";

/** Whether `dir` has a merge in progress (i.e. the last `git merge` stopped on a conflict). */
function isMergeInProgress(dir: string): boolean {
    return existsSync(path.join(dir, ".git", "MERGE_HEAD"));
}

/** Whether `origin/<branch>` exists — false if nothing has ever been pushed to that branch on the remote. */
async function remoteBranchExists(dir: string, branch: string): Promise<boolean> {
    try {
        await execGit(dir, ["rev-parse", "--verify", `refs/remotes/origin/${branch}`]);
        return true;
    } catch {
        return false;
    }
}

/** Current HEAD commit, or `null` if `dir`'s branch has no commits yet (an "unborn" branch). */
async function getHeadCommit(dir: string): Promise<string | null> {
    try {
        return (await execGit(dir, ["rev-parse", "HEAD"])).trim();
    } catch {
        return null;
    }
}

/**
 * Merges `origin/<branch>` into the current branch in `dir`.
 *
 * - If `origin/<branch>` doesn't exist yet (nothing has ever been
 *   pushed there), there's nothing to merge — reports "up-to-date"
 *   without attempting anything.
 * - `--allow-unrelated-histories` is always passed: the local repo may
 *   have been initialized independently of the remote (e.g. Backup ran
 *   here before Restore ever did), so the two histories may share no
 *   common ancestor even on a first, perfectly legitimate restore.
 * - If the merge can't complete automatically (the same file changed
 *   on both sides), the merge is immediately aborted — this app has no
 *   UI to resolve conflict markers, and leaving them in a Markdown file
 *   would break every other feature that reads it. Reports "conflict";
 *   the working tree is left exactly as it was before this call.
 */
export async function mergeRemoteBranch(dir: string, branch: string): Promise<MergeOutcome> {
    if (!(await remoteBranchExists(dir, branch))) {
        return "up-to-date";
    }

    const headBefore = await getHeadCommit(dir);

    try {
        await execGit(dir, ["merge", `origin/${branch}`, "--allow-unrelated-histories"]);
    } catch (error) {
        if (error instanceof GitCommandError && isMergeInProgress(dir)) {
            await execGit(dir, ["merge", "--abort"]);
            return "conflict";
        }
        throw error;
    }

    const headAfter = await getHeadCommit(dir);
    return headBefore === headAfter ? "up-to-date" : "merged";
}
