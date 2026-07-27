/**
 * The two shapes a FileSystemError's location information can take:
 * either a single path (most operations), or a source/destination pair
 * (move and copy operations). The two are mutually exclusive by
 * construction — an error never has both a bare `path` and a
 * `sourcePath`/`destinationPath` pair at once.
 */
type SinglePath = string;
type PathPair = { sourcePath: string; destinationPath: string };

/**
 * Error thrown by the filesystem module when an operation fails.
 * Wraps the original cause so callers retain the underlying stack/reason
 * while still getting a message that identifies the operation and the
 * path(s) involved.
 *
 * For single-path operations (readTextFile, writeTextFile, deleteFile,
 * ensureDirectoryExists, fileExists, listFilesRecursively), `path` is
 * set and `sourcePath`/`destinationPath` are undefined.
 *
 * For two-path operations (moveFile, copyFile), `sourcePath` and
 * `destinationPath` are set and `path` is undefined. Each path is kept
 * as its own distinct property rather than being encoded into a single
 * string, so callers can act on either one directly (e.g. checking
 * whether the source still exists after a failed move).
 */
export class FileSystemError extends Error {
  public readonly operation: string;
  public readonly path: string | undefined;
  public readonly sourcePath: string | undefined;
  public readonly destinationPath: string | undefined;
  public readonly cause: unknown;
  public readonly code: string | undefined;

  /**
   * @deprecated Use `path` instead. Kept as an alias for backwards
   * compatibility with code written against the original property name.
   * Undefined for two-path (move/copy) errors, since those never had a
   * single meaningful path to alias in the first place.
   */
  public readonly targetPath: string | undefined;

  /** Constructs an error for an operation on a single path. */
  constructor(operation: string, path: SinglePath, cause: unknown);
  /** Constructs an error for an operation on a source/destination pair. */
  constructor(operation: string, paths: PathPair, cause: unknown);
  constructor(operation: string, pathOrPaths: SinglePath | PathPair, cause: unknown) {
    const isPathPair = typeof pathOrPaths !== "string";
    const path = isPathPair ? undefined : pathOrPaths;
    const sourcePath = isPathPair ? pathOrPaths.sourcePath : undefined;
    const destinationPath = isPathPair ? pathOrPaths.destinationPath : undefined;

    const pathDescription = isPathPair
      ? `"${pathOrPaths.sourcePath}" -> "${pathOrPaths.destinationPath}"`
      : `"${pathOrPaths}"`;
    const causeMessage = cause instanceof Error ? cause.message : String(cause);

    super(`Filesystem operation "${operation}" failed for ${pathDescription}: ${causeMessage}`);

    this.name = "FileSystemError";
    this.operation = operation;
    this.path = path;
    this.sourcePath = sourcePath;
    this.destinationPath = destinationPath;
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
