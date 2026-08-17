"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ErrorPageProps {
    error: Error & { digest?: string };
    reset: () => void;
}

/**
 * Top-level error boundary for every route. Without this, an unhandled
 * error thrown while rendering — e.g. `listJournals()` failing because
 * the content root doesn't exist yet, a GitHub API outage or expired
 * token on the github-api storage backend, a misconfigured env var —
 * crashed to a blank, unstyled Next.js error screen with no way back
 * into the app short of a manual URL reload.
 *
 * Deliberately generic: the real error detail is logged server-side
 * (`console.error` below, picked up by the hosting platform's log
 * viewer) rather than shown to the user, consistent with how Server
 * Actions elsewhere in this app avoid echoing raw error text to the
 * client.
 */
export default function ErrorBoundary({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        console.error("Unhandled error rendering a page:", error);
    }, [error]);

    return (
        <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
            <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
            <h1 className="text-heading font-medium">Something went wrong.</h1>
            <p className="max-w-md text-body text-muted-foreground">
                This page hit an unexpected error. Your journal entries on disk (or in the configured content
                repository) are untouched — try again, or reload the page.
            </p>
            <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-body font-medium hover:bg-muted-foreground/10"
            >
                Try again
            </button>
        </main>
    );
}
