"use server";

import { gitRestoreService } from "../services";
import type { GitRestoreResult } from "../services";

/** Runs one full "Restore from Git" cycle: init-if-needed, safety-commit if dirty, fetch, merge. */
export async function restoreFromGit(): Promise<GitRestoreResult> {
    return gitRestoreService.restore();
}
