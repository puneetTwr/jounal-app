import { execGit } from "./execGit";

/** Commits everything currently staged in `dir` with `message`. */
export async function commitAllChanges(dir: string, message: string): Promise<void> {
    await execGit(dir, ["commit", "-m", message]);
}
