import { execGit } from "./execGit";

/** Initializes `dir` as a new Git repository with `main` as the initial branch. */
export async function initRepository(dir: string): Promise<void> {
    await execGit(dir, ["init", "-b", "main"]);
}
