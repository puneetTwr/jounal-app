import { GitCommandError } from "./errors";
import { execGit } from "./execGit";

/**
 * Ensures `dir`'s "origin" remote points at `remoteUrl` — adds it if
 * missing, updates it if it points somewhere else, and does nothing if
 * it's already correct. Never receives or stores a credential — this
 * only ever writes the plain repository URL to .git/config.
 */
export async function setRemoteUrl(dir: string, remoteUrl: string): Promise<void> {
    let currentUrl: string | null;

    try {
        currentUrl = (await execGit(dir, ["remote", "get-url", "origin"])).trim();
    } catch (error) {
        if (!(error instanceof GitCommandError)) {
            throw error;
        }
        currentUrl = null;
    }

    if (currentUrl === null) {
        await execGit(dir, ["remote", "add", "origin", remoteUrl]);
    } else if (currentUrl !== remoteUrl) {
        await execGit(dir, ["remote", "set-url", "origin", remoteUrl]);
    }
}
