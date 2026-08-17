"use server";

import { assertAuthenticated } from "@/lib/auth";
import { getStorageBackend } from "@/lib/config";

/**
 * Whether the Git backup/restore feature applies at all in this
 * deployment — false when JOURNAL_STORAGE_BACKEND is "github-api",
 * since every journal/template write already lands as a commit through
 * that backend and there's no separate local working tree left for
 * these buttons to stage/push or fetch/merge (see ADR-002).
 *
 * Distinct from isGitBackupConfigured(): "not configured" means the
 * feature applies but its env vars aren't set yet (a fixable, transient
 * state worth surfacing with a disabled button and an explanatory
 * message); this means the feature doesn't apply at all, regardless of
 * configuration — the UI hides the buttons entirely rather than showing
 * a permanently-disabled control with no "configure this" fix available.
 */
export async function isGitBackupFeatureAvailable(): Promise<boolean> {
    await assertAuthenticated();

    return getStorageBackend() === "filesystem";
}
