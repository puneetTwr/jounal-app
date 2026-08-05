import { existsSync } from "node:fs";
import path from "node:path";

/** Whether `dir` is already the root of a Git working tree (has a `.git` entry). */
export function isGitRepository(dir: string): boolean {
    return existsSync(path.join(dir, ".git"));
}
