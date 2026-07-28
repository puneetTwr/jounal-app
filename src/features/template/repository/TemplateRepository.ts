import type { TemplateEntry } from "../types";

/**
 * Read-side persistence contract for templates. Implementations compose
 * the filesystem, markdown, mapper, and validation layers; nothing
 * outside this repository is permitted to know how a TemplateEntry is
 * stored on disk.
 *
 * Only read operations exist so far — create/update/delete are out of
 * scope until template authoring is implemented.
 */
export interface TemplateRepository {
    /** Lists every template found in the templates directory. */
    listTemplates(): Promise<TemplateEntry[]>;

    /** Returns the template with the given id, or null if none exists. */
    getTemplate(id: string): Promise<TemplateEntry | null>;
}
