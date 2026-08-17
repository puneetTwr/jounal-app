"use server";

import { assertAuthenticated } from "@/lib/auth";
import { templateService } from "../services";
import type { TemplateEntry } from "../types";

/**
 * Lists every template. Read-only — no revalidation needed.
 */
export async function listTemplatesAction(): Promise<TemplateEntry[]> {
    await assertAuthenticated();

    return templateService.listTemplates();
}
