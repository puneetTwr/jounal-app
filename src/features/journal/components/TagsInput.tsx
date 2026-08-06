"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

interface TagsInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    disabled?: boolean;
}

function normalizeTag(rawTag: string): string {
    return rawTag.trim().toLowerCase();
}

/**
 * Add/remove/edit tag chips. Tags are trimmed and lowercased at the
 * point of entry — matching the domain validation layer's existing
 * lowercase/uniqueness rule (see features/journal/validation.ts)
 * proactively, so the user never hits a confusing server-side
 * validation error for formatting the UI can just normalize itself.
 */
export function TagsInput({ tags, onChange, disabled = false }: TagsInputProps) {
    const [draftTag, setDraftTag] = useState("");
    const inputId = useId();

    const normalizedDraft = normalizeTag(draftTag);
    const canAdd = normalizedDraft.length > 0 && !tags.includes(normalizedDraft);

    function addDraftTag() {
        if (!canAdd) {
            return;
        }
        onChange([...tags, normalizedDraft]);
        setDraftTag("");
    }

    function removeTag(tag: string) {
        onChange(tags.filter((existingTag) => existingTag !== tag));
    }

    /** Clicking a chip's text removes it and loads its text back into the input for editing. */
    function editTag(tag: string) {
        removeTag(tag);
        setDraftTag(tag);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            addDraftTag();
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-body font-medium">
                Tags
            </label>

            {tags.length > 0 && (
                <ul aria-label="Current tags" className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                        <li
                            key={tag}
                            className="flex animate-[pop-in_150ms_ease-out] items-center gap-1 rounded-full bg-muted-foreground/10 py-0.5 pr-1 pl-2 text-meta"
                        >
                            <button
                                type="button"
                                onClick={() => editTag(tag)}
                                disabled={disabled}
                                className="hover:underline disabled:pointer-events-none"
                                aria-label={`Edit tag ${tag}`}
                            >
                                {tag}
                            </button>
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                disabled={disabled}
                                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground disabled:pointer-events-none"
                                aria-label={`Remove tag ${tag}`}
                            >
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex gap-2">
                <input
                    id={inputId}
                    type="text"
                    value={draftTag}
                    onChange={(event) => setDraftTag(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder="Add a tag and press Enter"
                    className="flex-1 rounded border border-border bg-surface px-3 py-2 text-body disabled:opacity-50"
                />
                <button
                    type="button"
                    onClick={addDraftTag}
                    disabled={disabled || !canAdd}
                    className="rounded border border-border px-3 py-2 text-body font-medium disabled:opacity-50"
                >
                    Add
                </button>
            </div>
        </div>
    );
}
