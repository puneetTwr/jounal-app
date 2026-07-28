import {
    isRecord,
    issue,
    validateIsoDateTime,
    validateNonEmptyString,
    validateTags,
    validateUuid,
    type ValidationIssue,
    type ValidationResult,
} from "@/lib/validation";
import { TEMPLATE_SCHEMA_VERSION } from "./constants";
import type { TemplateEntry, TemplateFrontMatter } from "./types";

export type { ValidationIssue, ValidationResult };

/**
 * Schema versions this build of the application knows how to validate.
 * Adding support for a future front matter schema version means adding
 * it here and, if its rules differ from version 1, branching the field
 * validators below on `frontMatter.version` — the public validation API
 * does not need to change.
 */
const SUPPORTED_SCHEMA_VERSIONS: ReadonlyArray<TemplateFrontMatter["version"]> = [
    TEMPLATE_SCHEMA_VERSION,
];

function validateSchemaVersion(
    value: unknown,
    path: string,
    issues: ValidationIssue[]
): void {
    if (!SUPPORTED_SCHEMA_VERSIONS.includes(value as TemplateFrontMatter["version"])) {
        issues.push(
            issue(
                path,
                "UNSUPPORTED_SCHEMA_VERSION",
                `Expected one of schema versions [${SUPPORTED_SCHEMA_VERSIONS.join(", ")}], received ${JSON.stringify(value)}.`
            )
        );
    }
}

/** Validates the optional `description` field: if present at all, it must be a string. */
function validateOptionalDescription(value: unknown, path: string, issues: ValidationIssue[]): void {
    if (value !== undefined && typeof value !== "string") {
        issues.push(
            issue(path, "INVALID_DESCRIPTION", `Expected a string, received ${JSON.stringify(value)}.`)
        );
    }
}

/**
 * Validates an unknown value as a TemplateFrontMatter object.
 *
 * Enforces: schema version support, UUID format for `id`, a required
 * non-empty `name`, an optional string `description`, ISO date-time
 * format for `createdAt`/`updatedAt`, and unique lowercase `tags`.
 *
 * The input is `unknown` because front matter arriving from the
 * Markdown layer is untrusted, arbitrary data — validation is what
 * establishes that it can be treated as a TemplateFrontMatter, not an
 * assumption made beforehand. Does not mutate the input.
 */
export function validateTemplateFrontMatter(
    frontMatter: unknown
): ValidationResult<TemplateFrontMatter> {
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
    validateNonEmptyString(frontMatter.name, "name", "NAME_REQUIRED", issues);
    validateOptionalDescription(frontMatter.description, "description", issues);
    validateIsoDateTime(frontMatter.createdAt, "createdAt", issues);
    validateIsoDateTime(frontMatter.updatedAt, "updatedAt", issues);
    validateTags(frontMatter.tags, "tags", issues);

    if (issues.length > 0) {
        return { valid: false, issues };
    }

    return { valid: true, value: frontMatter as unknown as TemplateFrontMatter };
}

/**
 * Validates an unknown value as a TemplateEntry: its front matter,
 * validated via validateTemplateFrontMatter() with issue paths prefixed
 * by "frontMatter.", plus its own `content`, which must be a string.
 * Does not mutate the input.
 */
export function validateTemplateEntry(entry: unknown): ValidationResult<TemplateEntry> {
    if (!isRecord(entry)) {
        return {
            valid: false,
            issues: [issue("", "INVALID_ENTRY", `Expected an object, received ${JSON.stringify(entry)}.`)],
        };
    }

    const frontMatterResult = validateTemplateFrontMatter(entry.frontMatter);
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
            frontMatter: (frontMatterResult as { valid: true; value: TemplateFrontMatter }).value,
            content: entry.content as string,
        },
    };
}
