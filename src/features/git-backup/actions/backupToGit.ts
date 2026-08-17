"use server";

import { assertAuthenticated } from "@/lib/auth";
import { gitBackupService, type GitBackupResult } from "../services";

/** Runs one full "Backup to Git" cycle: init-if-needed, stage, commit, push. */
export async function backupToGit(): Promise<GitBackupResult> {
    await assertAuthenticated();

    return gitBackupService.backup();
}

/** Whether Git backup is configured (both env vars set) — used to render the button's initial state on page load. */
export async function isGitBackupConfigured(): Promise<boolean> {
    await assertAuthenticated();

    return gitBackupService.isConfigured();
}
