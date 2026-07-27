"use client";

import "@uiw/react-md-editor/markdown-editor.css";
import dynamic from "next/dynamic";
import { journalEditorCommands } from "./editorCommands";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

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
 * formatting toolbar, not a live-preview/WYSIWYG surface: the detail
 * page already has JournalMarkdown for rendering saved content
 * elsewhere, so a second rendered view here would be redundant.
 *
 * Dynamically imported with `ssr: false` because @uiw/react-md-editor
 * reads `window`/`document` at import time and cannot run during
 * server rendering — this is only valid because this module itself is
 * a Client Component ("use client" above); Next.js's App Router
 * rejects `ssr: false` dynamic imports inside Server Components.
 *
 * The editor's own chrome is fixed to light mode for now (see
 * `data-color-mode`) — theming it to follow the app's dark mode is out
 * of scope for this Markdown-editing milestone.
 */
export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
    return (
        <div data-color-mode="light">
            <MDEditor
                value={value}
                onChange={onChange}
                preview="edit"
                height={480}
                commands={journalEditorCommands}
                textareaProps={{ "aria-label": "Journal content (Markdown)" }}
            />
        </div>
    );
}
