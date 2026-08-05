import { execGit } from "./execGit";

/** Whether `dir` has any staged, unstaged, or untracked changes relative to HEAD. */
export async function hasUncommittedChanges(dir: string): Promise<boolean> {
    const output = await execGit(dir, ["status", "--porcelain"]);
    return output.trim().length > 0;
}
