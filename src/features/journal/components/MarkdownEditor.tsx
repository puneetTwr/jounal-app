"use client";

import "@uiw/react-md-editor/markdown-editor.css";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { journalEditorCommands } from "./editorCommands";
import { safeMarkdownUrlTransform } from "./safeMarkdownUrlTransform";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
    ssr: false,
    loading: () => <Skeleton className="h-[55vh] w-full rounded-lg" />,
});

interface MarkdownEditorProps {
    value: string;
    onChange: (value?: string) => void;
}

/**
 * Thin wrapper around @uiw/react-md-editor, isolating the rest of the
 * app from this specific third-party library — swapping editors later
 * only touches this file.
 *
 * `preview="edit"` keeps this a raw Markdown source editor with a
 * formatting toolbar, not a live-preview/WYSIWYG surface — a separate
 * rendered view isn't needed alongside it. `previewOptions` (skipHtml +
 * a safe urlTransform) has no visible effect while that stays true, but
 * is set anyway so a future switch to "live"/"preview" mode doesn't
 * silently reintroduce the raw-HTML rendering gap closed in
 * JournalContentView — see SECURITY_HARDENING_CHECKLIST.md item 12.
 *
 * Dynamically imported with `ssr: false` because @uiw/react-md-editor
 * reads `window`/`document` at import time and cannot run during
 * server rendering — this is only valid because this module itself is
 * a Client Component ("use client" above); Next.js's App Router
 * rejects `ssr: false` dynamic imports inside Server Components.
 *
 * `data-color-mode="auto"` uses the editor's own built-in dark theme
 * and switches with the `prefers-color-scheme` media query — the same
 * signal `globals.css` uses for the rest of the app's dark mode, and
 * there's no manual light/dark toggle here to keep in sync with.
 *
 * `height` is a viewport-relative unit rather than a fixed pixel value
 * so the editor scales down on its own on a short viewport (a landscape
 * phone, or a portrait one with the on-screen keyboard open) — no
 * breakpoint or JS media-query check needed for that. (A `%` height
 * would need one instead: the library's own docs note `visibleDragbar`
 * breaks under a percentage height, which `vh` isn't subject to since
 * it's relative to the viewport, not the parent.)
 */
export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
    return (
        <div data-color-mode="auto">
            <MDEditor
                value={value}
                onChange={onChange}
                preview="edit"
                height="55vh"
                commands={journalEditorCommands}
                textareaProps={{ "aria-label": "Journal content (Markdown)" }}
                previewOptions={{ skipHtml: true, urlTransform: safeMarkdownUrlTransform }}
            />
        </div>
    );
}
