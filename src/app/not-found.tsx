import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { JOURNAL_LIST_PATH } from "@/features/journal/actions/paths";

/**
 * Styled 404, matching error.tsx's layout/tone — without this, a bad
 * or stale journal link (e.g. a deleted entry's URL still open in
 * another tab) fell through to Next's unstyled default 404 with no way
 * back into the app.
 */
export default function NotFound() {
    return (
        <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
            <FileQuestion className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-heading font-medium">Page not found.</h1>
            <p className="max-w-md text-body text-muted-foreground">
                This page doesn&apos;t exist, or the journal entry it pointed to may have been deleted.
            </p>
            <Link
                href={JOURNAL_LIST_PATH}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-body font-medium hover:bg-muted-foreground/10"
            >
                Back to Journals
            </Link>
        </main>
    );
}
