import { execGit } from "./execGit";
import { buildTokenAuthEnv } from "./tokenAuthEnv";

/**
 * Pushes `branch` to `dir`'s "origin" remote, authenticating with
 * `token` via a single-invocation `http.extraheader` (see
 * buildTokenAuthEnv) so the credential never touches disk or argv.
 */
export async function pushToRemote(dir: string, branch: string, token: string): Promise<void> {
    await execGit(dir, ["push", "origin", branch], buildTokenAuthEnv(token));
}
