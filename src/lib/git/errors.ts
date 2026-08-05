/** Thrown when a `git` invocation exits non-zero. Wraps git's own stderr. */
export class GitCommandError extends Error {
    public readonly command: string;

    constructor(args: string[], stderr: string) {
        const command = `git ${args.join(" ")}`;
        super(`${command} failed: ${stderr.trim() || "no error output"}`);
        this.name = "GitCommandError";
        this.command = command;
        Object.freeze(this);
    }
}
