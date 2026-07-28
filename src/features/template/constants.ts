import type { TemplateFrontMatter } from "./types";

/**
 * The current template front matter schema version. Every TemplateEntry
 * created by this application is stamped with this value, so that a
 * future schema change has something concrete to migrate away from.
 */
export const TEMPLATE_SCHEMA_VERSION: TemplateFrontMatter["version"] = 1;

/**
 * The canonical order in which front matter keys should appear.
 * Typed against `keyof TemplateFrontMatter` so this list cannot drift
 * out of sync with the TemplateFrontMatter interface without a
 * compiler error.
 */
export const TEMPLATE_FRONT_MATTER_KEY_ORDER: ReadonlyArray<keyof TemplateFrontMatter> = [
    "version",
    "id",
    "name",
    "description",
    "createdAt",
    "updatedAt",
    "tags",
];

/** Default value for a template's tags when none are provided. */
export const DEFAULT_TEMPLATE_TAGS: ReadonlyArray<string> = [];
