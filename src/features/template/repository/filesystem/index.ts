import { getTemplate } from "./getTemplate";
import { listTemplates } from "./listTemplates";
import type { TemplateRepository } from "../TemplateRepository";

/**
 * Filesystem-backed implementation of TemplateRepository, composing the
 * filesystem, markdown, mapper, and validation layers. This is the only
 * module in the template domain permitted to know about those layers.
 * The original architecture (see ADR-001) and still the default — used
 * by local development and any host with a real persistent disk.
 */
export const filesystemTemplateRepository: TemplateRepository = {
    listTemplates,
    getTemplate,
};
