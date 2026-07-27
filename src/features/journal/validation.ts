import { JOURNAL_SCHEMA_VERSION } from "./constants";
import type { JournalEntry, JournalFrontMatter } from "./types";

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
 * union: future validation rules can introduce new codes without
 * that being a breaking type change for existing callers.
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

/**
 * Schema versions this build of the application knows how to validate.
 * Adding support for a future front matter schema version means adding
 * it here and, if its rules differ from version 1, branching the field
 * validators below on `frontMatter.version` — the public validation API
 * does not need to change.
 */
const SUPPORTED_SCHEMA_VERSIONS: ReadonlyArray<JournalFrontMatter["version"]> = [
    JOURNAL_SCHEMA_VERSION,
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function issue(path: string, code: string, message: string): ValidationIssue {
    return { path, code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSchemaVersion(
    value: unknown,
    path: string,
    issues: ValidationIssue[]
): void {
    if (!SUPPORTED_SCHEMA_VERSIONS.includes(value as JournalFrontMatter["version"])) {
        issues.push(
            issue(
                path,
                "UNSUPPORTED_SCHEMA_VERSION",
                `Expected one of schema versions [${SUPPORTED_SCHEMA_VERSIONS.join(", ")}], received ${JSON.stringify(value)}.`
            )
        );
    }
}

function validateUuid(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
        issues.push(issue(path, "INVALID_UUID", `Expected a UUID string, received ${JSON.stringify(value)}.`));
    }
}

function validateNonEmptyString(
    value: unknown,
    path: string,
    code: string,
    issues: ValidationIssue[]
): void {
    if (typeof value !== "string" || value.trim().length === 0) {
        issues.push(issue(path, code, `Expected a non-empty string, received ${JSON.stringify(value)}.`));
    }
}

function validateIsoDate(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
        issues.push(
            issue(path, "INVALID_DATE", `Expected an ISO date (YYYY-MM-DD), received ${JSON.stringify(value)}.`)
        );
    }
}

function validateIsoDateTime(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (typeof value !== "string" || !ISO_DATE_TIME_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
        issues.push(
            issue(path, "INVALID_DATE_TIME", `Expected an ISO date-time string, received ${JSON.stringify(value)}.`)
        );
    }
}

function validateTags(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (!Array.isArray(value)) {
        issues.push(issue(path, "INVALID_TAGS", `Expected an array of strings, received ${JSON.stringify(value)}.`));
        return;
    }

    const seenTags = new Set<string>();

    value.forEach((tag, index) => {
        const tagPath = `${path}[${index}]`;

        if (typeof tag !== "string" || tag.trim().length === 0) {
            issues.push(
                issue(tagPath, "INVALID_TAG", `Expected a non-empty string, received ${JSON.stringify(tag)}.`)
            );
            return;
        }

        if (tag !== tag.toLowerCase()) {
            issues.push(issue(tagPath, "TAG_NOT_LOWERCASE", `Tag "${tag}" must be lowercase.`));
        }

        if (seenTags.has(tag)) {
            issues.push(issue(tagPath, "DUPLICATE_TAG", `Tag "${tag}" is duplicated.`));
        }

        seenTags.add(tag);
    });
}

function validateBoolean(
    value: unknown,
    path: string,
    code: string,
    issues: ValidationIssue[]
): void {
    if (typeof value !== "boolean") {
        issues.push(issue(path, code, `Expected a boolean, received ${JSON.stringify(value)}.`));
    }
}

/**
 * Validates an unknown value as a JournalFrontMatter object.
 *
 * Enforces: schema version support, UUID format for `id`, ISO date
 * format for `journalDate`, ISO date-time format for `createdAt`/
 * `updatedAt`, a required non-empty `title`, unique lowercase `tags`,
 * and that `favorite`/`pinned`/`archived` are genuine booleans.
 *
 * The input is `unknown` because front matter arriving from the
 * Markdown layer is untrusted, arbitrary data — validation is what
 * establishes that it can be treated as a JournalFrontMatter, not an
 * assumption made beforehand. Does not mutate the input.
 */
export function validateJournalFrontMatter(
    frontMatter: unknown
): ValidationResult<JournalFrontMatter> {
    if (!isRecord(frontMatter)) {
        return {
            valid: false,
            issues: [
                issue(
                    "",
                    "INVALID_FRONT_MATTER",
                    `Expected an object, received ${JSON.stringify(frontMatter)}.`
                ),
            ],
        };
    }

    const issues: ValidationIssue[] = [];

    validateSchemaVersion(frontMatter.version, "version", issues);
    validateUuid(frontMatter.id, "id", issues);
    validateNonEmptyString(frontMatter.title, "title", "TITLE_REQUIRED", issues);
    validateIsoDate(frontMatter.journalDate, "journalDate", issues);
    validateIsoDateTime(frontMatter.createdAt, "createdAt", issues);
    validateIsoDateTime(frontMatter.updatedAt, "updatedAt", issues);
    validateTags(frontMatter.tags, "tags", issues);
    validateBoolean(frontMatter.favorite, "favorite", "INVALID_FAVORITE", issues);
    validateBoolean(frontMatter.pinned, "pinned", "INVALID_PINNED", issues);
    validateBoolean(frontMatter.archived, "archived", "INVALID_ARCHIVED", issues);

    if (issues.length > 0) {
        return { valid: false, issues };
    }

    return { valid: true, value: frontMatter as unknown as JournalFrontMatter };
}

/**
 * Validates an unknown value as a JournalEntry: its front matter,
 * validated via validateJournalFrontMatter() with issue paths prefixed
 * by "frontMatter.", plus its own `content`, which must be a string.
 * Does not mutate the input.
 */
export function validateJournalEntry(entry: unknown): ValidationResult<JournalEntry> {
    if (!isRecord(entry)) {
        return {
            valid: false,
            issues: [issue("", "INVALID_ENTRY", `Expected an object, received ${JSON.stringify(entry)}.`)],
        };
    }

    const frontMatterResult = validateJournalFrontMatter(entry.frontMatter);
    const issues: ValidationIssue[] = frontMatterResult.valid
        ? []
        : frontMatterResult.issues.map((frontMatterIssue) => ({
              ...frontMatterIssue,
              path: frontMatterIssue.path ? `frontMatter.${frontMatterIssue.path}` : "frontMatter",
          }));

    if (typeof entry.content !== "string") {
        issues.push(
            issue(
                "content",
                "INVALID_CONTENT",
                `Expected content to be a string, received ${JSON.stringify(entry.content)}.`
            )
        );
    }

    if (issues.length > 0) {
        return { valid: false, issues };
    }

    return {
        valid: true,
        value: {
            frontMatter: (frontMatterResult as { valid: true; value: JournalFrontMatter }).value,
            content: entry.content as string,
        },
    };
}
