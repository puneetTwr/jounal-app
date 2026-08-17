"use server";

import { assertAuthenticated } from "@/lib/auth";
import { templateService } from "../services";
import type { TemplateEntry } from "../types";

/**
 * Returns the template with the given id, or null if none exists.
 * Read-only — no revalidation needed.
 */
export async function getTemplateAction(id: string): Promise<TemplateEntry | null> {
    await assertAuthenticated();

    return templateService.getTemplate(id);
}
