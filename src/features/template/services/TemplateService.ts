import { templateRepository } from "../repository";
import type { TemplateEntry } from "../types";

/**
 * Application-level use cases for working with templates.
 *
 * This is the only layer Server Actions are permitted to call directly
 * — Server Actions must never import the Template Repository
 * themselves. TemplateService knows nothing about React, Next.js, the
 * filesystem, Markdown, or paths; it only composes the Template
 * Repository.
 *
 * Both methods here delegate straight through to the repository,
 * unchanged — there is no business rule yet (no search/filter, no
 * variable substitution, no journal-from-template creation). That is
 * deliberate: the purpose of this layer is to establish the same
 * stable boundary between Server Actions and the Repository that
 * JournalService establishes, so that future orchestration has a
 * proper home without any Server Action ever needing to change.
 */
export interface TemplateService {
    /** Lists every template. */
    listTemplates(): Promise<TemplateEntry[]>;

    /** Returns the template with the given id, or null if none exists. */
    getTemplate(id: string): Promise<TemplateEntry | null>;
}

export const templateService: TemplateService = {
    listTemplates: () => templateRepository.listTemplates(),
    getTemplate: (id) => templateRepository.getTemplate(id),
};
