/**
 * A single validation failure, describing exactly one thing that was
 * wrong with the value under validation.
 *
 * `code` is a machine-readable identifier (e.g. "INVALID_UUID",
 * "TITLE_REQUIRED") that callers can branch on; `message` is a
 * human-readable description suitable for surfacing to a user or a
 * log. `path` identifies where in the input the failure occurred
 * (e.g. "title", "tags[2]"), so multiple issues on different fields
 * can be reported together and distinguished from one another.
 *
 * `code` is intentionally typed as `string` rather than a closed
 * union: every domain that validates against this shape can introduce
 * new codes without that being a breaking type change for existing
 * callers.
 */
export interface ValidationIssue {
    path: string;
    code: string;
    message: string;
}

/**
 * The result of validating a value against a schema.
 *
 * On success, `value` holds the input narrowed to the validated type.
 * On failure, `issues` holds every failure found, not just the first,
 * so callers can report or correct multiple problems at once.
 *
 * Adding new validation rules only ever adds more possible `issues`
 * entries or narrows what counts as success — it never changes this
 * shape, so callers written against `ValidationResult<T>` today keep
 * working as more rules are added later.
 */
export type ValidationResult<T> =
    | { valid: true; value: T }
    | { valid: false; issues: ValidationIssue[] };
