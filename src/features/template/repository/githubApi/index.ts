import { getTemplate } from "./getTemplate";
import { listTemplates } from "./listTemplates";
import type { TemplateRepository } from "../TemplateRepository";

/**
 * GitHub-API-backed implementation of TemplateRepository — reads
 * template content through GitHub's Git Data/Contents APIs instead of a
 * local disk, for hosts with no persistent filesystem (e.g. Vercel).
 * See ADR-002.
 */
export const githubTemplateRepository: TemplateRepository = {
    listTemplates,
    getTemplate,
};
