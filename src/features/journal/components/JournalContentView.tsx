"use client";

import "@uiw/react-md-editor/markdown-editor.css";
import dynamic from "next/dynamic";

const MarkdownPreview = dynamic(
    () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
    { ssr: false }
);

interface JournalContentViewProps {
    content: string;
}

/**
 * Read-only rendered view of a journal entry's Markdown body — the
 * default view when opening an existing entry, with MarkdownEditor only
 * mounted once the user explicitly clicks Edit (see JournalBodyEditor).
 *
 * Renders through @uiw/react-markdown-preview, the same engine
 * MarkdownEditor's own live-preview pane uses, so content looks
 * identical whether you're viewing or editing it.
 *
 * Dynamically imported with `ssr: false` for the same reason as
 * MarkdownEditor: the underlying library reads `window`/`document` at
 * import time and cannot run during server rendering.
 */
export function JournalContentView({ content }: JournalContentViewProps) {
    if (content.trim().length === 0) {
        return <p className="text-body italic text-muted-foreground">This entry is empty.</p>;
    }

    return (
        <div data-color-mode="auto">
            <MarkdownPreview
                source={content}
                className="rounded-lg border border-border bg-surface p-6"
            />
        </div>
    );
}
