/**
 * Error thrown by the filesystem module when an operation fails.
 * Wraps the original cause so callers retain the underlying stack/reason
 * while still getting a message that identifies the operation and path.
 */
export class FileSystemError extends Error {
  public readonly operation: string;
  public readonly path: string;
  public readonly cause: unknown;
  public readonly code: string | undefined;

  /**
   * @deprecated Use `path` instead. Kept as an alias for backwards
   * compatibility with code written against the original property name.
   */
  public readonly targetPath: string;

  constructor(operation: string, path: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`Filesystem operation "${operation}" failed for "${path}": ${causeMessage}`);

    this.name = "FileSystemError";
    this.operation = operation;
    this.path = path;
    this.targetPath = path;
    this.cause = cause;
    this.code = extractErrorCode(cause);

    if (cause instanceof Error && typeof cause.stack === "string") {
      this.stack = `${this.stack ?? ""}\nCaused by: ${cause.stack}`;
    }

    Object.freeze(this);
  }
}

/**
 * Extracts a Node.js error code (e.g. "ENOENT", "EACCES") from an
 * unknown thrown value, if one is present.
 */
function extractErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Narrow check for Node's error shape without depending on a specific
 * fs error type, so callers can branch on error codes such as "ENOENT".
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
