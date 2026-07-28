import type { ValidationIssue } from "./types";

/** Formats a list of validation issues as a single human-readable string, for use in error messages. */
export function describeIssues(issues: ValidationIssue[]): string {
    return issues.map((issue) => `${issue.path || "(root)"}: ${issue.message}`).join("; ");
}
