"use server";

import { templateService } from "../services";
import type { TemplateEntry } from "../types";

/**
 * Returns the template with the given id, or null if none exists.
 * Read-only — no revalidation needed.
 */
export async function getTemplateAction(id: string): Promise<TemplateEntry | null> {
    return templateService.getTemplate(id);
}
