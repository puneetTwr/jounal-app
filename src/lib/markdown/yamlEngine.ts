import { load, dump, CORE_SCHEMA } from "js-yaml";

/**
 * Custom YAML engine used in place of gray-matter's default.
 *
 * gray-matter's default schema implicitly resolves date-shaped scalars
 * (e.g. "2026-07-27") into JavaScript Date objects, which would
 * silently rewrite ISO date strings on every parse/serialize round
 * trip. CORE_SCHEMA preserves such scalars as plain strings while
 * still resolving booleans, numbers, null, and collections (arrays/
 * mappings) the same way the default schema would.
 *
 * This is an internal implementation detail of this module and is not
 * part of its public API.
 */
export const yamlEngine = {
  parse(input: string): Record<string, unknown> {
    const result: unknown = load(input, { schema: CORE_SCHEMA });
    return isPlainObject(result) ? result : {};
  },
  stringify(data: object): string {
    return dump(data, { schema: CORE_SCHEMA });
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
