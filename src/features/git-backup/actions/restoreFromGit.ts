"use server";

import { assertAuthenticated } from "@/lib/auth";
import { gitRestoreService } from "../services";
import type { GitRestoreResult } from "../services";

/** Runs one full "Restore from Git" cycle: init-if-needed, safety-commit if dirty, fetch, merge. */
export async function restoreFromGit(): Promise<GitRestoreResult> {
    await assertAuthenticated();

    return gitRestoreService.restore();
}
