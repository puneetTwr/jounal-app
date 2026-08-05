import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GitCommandError } from "./errors";

const execFileAsync = promisify(execFile);

function extractStderr(error: unknown): string {
    const stderr = (error as { stderr?: unknown } | null)?.stderr;
    return typeof stderr === "string" ? stderr : String(error);
}

/**
 * Runs `git <args>` in `cwd` and returns stdout, throwing GitCommandError
 * on a non-zero exit — the only error shape every other function in
 * this module needs to handle.
 *
 * `extraEnv`, when provided, is merged over the current process's
 * environment for this invocation only. This is how pushToRemote()
 * passes a short-lived push credential to git: as an environment
 * variable on this one child process, never as a command-line argument
 * (which would be visible in this process's argv) and never persisted
 * into the repository's on-disk .git/config.
 */
export async function execGit(cwd: string, args: string[], extraEnv?: Record<string, string>): Promise<string> {
    try {
        const { stdout } = await execFileAsync("git", args, {
            cwd,
            env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
        });
        return stdout;
    } catch (error) {
        throw new GitCommandError(args, extractStderr(error));
    }
}
