import { getTemplate } from "./getTemplate";
import { listTemplates } from "./listTemplates";
import type { TemplateRepository } from "./TemplateRepository";

export type { TemplateRepository } from "./TemplateRepository";

/**
 * Filesystem-backed implementation of TemplateRepository, composing the
 * filesystem, markdown, mapper, and validation layers. This is the only
 * module in the template domain permitted to know about those layers.
 */
export const templateRepository: TemplateRepository = {
    listTemplates,
    getTemplate,
};
