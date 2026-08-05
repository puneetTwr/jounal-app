import { execGit } from "./execGit";

/** Stages every new, modified, and deleted file under `dir` (`git add -A`). */
export async function stageAllChanges(dir: string): Promise<void> {
    await execGit(dir, ["add", "-A"]);
}
