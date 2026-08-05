import { execGit } from "./execGit";
import { buildTokenAuthEnv } from "./tokenAuthEnv";

/** Fetches `dir`'s "origin" remote, authenticating with `token` the same way pushToRemote does. */
export async function fetchFromRemote(dir: string, token: string): Promise<void> {
    await execGit(dir, ["fetch", "origin"], buildTokenAuthEnv(token));
}
