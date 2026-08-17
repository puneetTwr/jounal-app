import type { ValidationIssue } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function issue(path: string, code: string, message: string): ValidationIssue {
    return { path, code, message };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateUuid(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (!isValidUuid(value)) {
        issues.push(issue(path, "INVALID_UUID", `Expected a UUID string, received ${JSON.stringify(value)}.`));
    }
}

/** Whether `value` is a syntactically valid UUID string. */
export function isValidUuid(value: unknown): value is string {
    return typeof value === "string" && UUID_PATTERN.test(value);
}

export function validateNonEmptyString(
    value: unknown,
    path: string,
    code: string,
    issues: ValidationIssue[]
): void {
    if (typeof value !== "string" || value.trim().length === 0) {
        issues.push(issue(path, code, `Expected a non-empty string, received ${JSON.stringify(value)}.`));
    }
}

export function validateIsoDate(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
        issues.push(
            issue(path, "INVALID_DATE", `Expected an ISO date (YYYY-MM-DD), received ${JSON.stringify(value)}.`)
        );
    }
}

export function validateIsoDateTime(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (typeof value !== "string" || !ISO_DATE_TIME_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
        issues.push(
            issue(path, "INVALID_DATE_TIME", `Expected an ISO date-time string, received ${JSON.stringify(value)}.`)
        );
    }
}

export function validateTags(value: unknown, path: string, issues: ValidationIssue[]): void {
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

export function validateBoolean(
    value: unknown,
    path: string,
    code: string,
    issues: ValidationIssue[]
): void {
    if (typeof value !== "boolean") {
        issues.push(issue(path, code, `Expected a boolean, received ${JSON.stringify(value)}.`));
    }
}
