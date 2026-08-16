import { describeIssues, type ValidationIssue } from "@/lib/validation";

/**
 * Thrown when an operation requires an existing journal entry (e.g.
 * updateEntry, deleteEntry) but no entry with the given id is present
 * on disk. getEntry() does not throw this — it returns null instead,
 * per its documented contract.
 */
export class JournalEntryNotFoundError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`Journal entry "${id}" was not found.`);
        this.name = "JournalEntryNotFoundError";
        this.id = id;
        Object.freeze(this);
    }
}

/**
 * Thrown by getJournalEntryFilePath() when the given id is not a
 * well-formed UUID. Every path-taking repository function (getEntry,
 * deleteEntry, createEntry, updateEntry) routes through that helper, so
 * this is what stops a malformed or malicious id (e.g. containing `../`)
 * from ever being joined into a filesystem path.
 */
export class InvalidJournalEntryIdError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`"${id}" is not a valid journal entry id.`);
        this.name = "InvalidJournalEntryIdError";
        this.id = id;
        Object.freeze(this);
    }
}

/** Thrown by createEntry() when an entry with the given id already exists. */
export class JournalEntryAlreadyExistsError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`Journal entry "${id}" already exists.`);
        this.name = "JournalEntryAlreadyExistsError";
        this.id = id;
        Object.freeze(this);
    }
}

/**
 * Thrown by createEntry()/updateEntry() when the JournalEntry passed in
 * fails validateJournalEntry(). Carries every issue found, not just the
 * first, consistent with ValidationResult's "report everything at once"
 * design.
 */
export class JournalValidationError extends Error {
    public readonly issues: ValidationIssue[];

    constructor(issues: ValidationIssue[]) {
        super(`Journal entry failed validation: ${describeIssues(issues)}`);
        this.name = "JournalValidationError";
        this.issues = issues;
        Object.freeze(this);
    }
}

/**
 * Thrown when a Markdown file read from the journals directory does not
 * parse into a valid JournalEntry. This indicates the file on disk is
 * corrupt or was hand-edited into an invalid shape, not a validation
 * failure on data the application itself is about to write.
 */
export class JournalEntryParseError extends Error {
    public readonly filePath: string;
    public readonly issues: ValidationIssue[];

    constructor(filePath: string, issues: ValidationIssue[]) {
        super(`Journal entry file "${filePath}" failed validation: ${describeIssues(issues)}`);
        this.name = "JournalEntryParseError";
        this.filePath = filePath;
        this.issues = issues;
        Object.freeze(this);
    }
}
