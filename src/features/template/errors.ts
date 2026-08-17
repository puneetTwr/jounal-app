import { describeIssues, type ValidationIssue } from "@/lib/validation";

/**
 * Thrown when an operation requires an existing template (e.g.
 * updateEntry, deleteEntry) but no template with the given id is
 * present on disk. getEntry() does not throw this — it returns null
 * instead, per its documented contract.
 */
export class TemplateNotFoundError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`Template "${id}" was not found.`);
        this.name = "TemplateNotFoundError";
        this.id = id;
        Object.freeze(this);
    }
}

/**
 * Thrown by getTemplateFilePath() when the given id is not a
 * well-formed UUID. Every path-taking repository function routes
 * through that helper, so this is what stops a malformed or malicious
 * id (e.g. containing `../`) from ever being joined into a filesystem
 * path.
 */
export class InvalidTemplateIdError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`"${id}" is not a valid template id.`);
        this.name = "InvalidTemplateIdError";
        this.id = id;
        Object.freeze(this);
    }
}

/** Thrown by createEntry() when a template with the given id already exists. */
export class TemplateAlreadyExistsError extends Error {
    public readonly id: string;

    constructor(id: string) {
        super(`Template "${id}" already exists.`);
        this.name = "TemplateAlreadyExistsError";
        this.id = id;
        Object.freeze(this);
    }
}

/**
 * Thrown by createEntry()/updateEntry() when the TemplateEntry passed in
 * fails validateTemplateEntry(). Carries every issue found, not just the
 * first, consistent with ValidationResult's "report everything at once"
 * design.
 */
export class TemplateValidationError extends Error {
    public readonly issues: ValidationIssue[];

    constructor(issues: ValidationIssue[]) {
        super(`Template failed validation: ${describeIssues(issues)}`);
        this.name = "TemplateValidationError";
        this.issues = issues;
        Object.freeze(this);
    }
}

/**
 * Thrown when a Markdown file read from the templates directory does not
 * parse into a valid TemplateEntry. This indicates the file on disk is
 * corrupt or was hand-edited into an invalid shape, not a validation
 * failure on data the application itself is about to write.
 */
export class TemplateParseError extends Error {
    public readonly filePath: string;
    public readonly issues: ValidationIssue[];

    constructor(filePath: string, issues: ValidationIssue[]) {
        super(`Template file "${filePath}" failed validation: ${describeIssues(issues)}`);
        this.name = "TemplateParseError";
        this.filePath = filePath;
        this.issues = issues;
        Object.freeze(this);
    }
}
