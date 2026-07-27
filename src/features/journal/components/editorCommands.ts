import {
    bold,
    codeBlock,
    divider,
    hr,
    italic,
    link,
    orderedListCommand,
    quote,
    table,
    title,
    unorderedListCommand,
    type ICommand,
} from "@uiw/react-md-editor/commands";

/**
 * Hand-picked toolbar commands for the journal body editor, matching
 * exactly the formatting features this milestone asks for: headings,
 * bold, italic, lists (bulleted and numbered), blockquotes, fenced code
 * blocks, tables, links, and horizontal rules. @uiw/react-md-editor
 * ships several other commands (image, checklists, strikethrough,
 * fullscreen, GitHub issue links, live preview toggles) that are
 * deliberately left out here to keep the toolbar scoped to what was
 * requested.
 *
 * This intentionally replaces the "EditorToolbar.tsx" component
 * suggested for this milestone: @uiw/react-md-editor renders its own
 * toolbar internally from a `commands` array rather than accepting a
 * separately-rendered toolbar component, so there is no toolbar UI
 * left for a component of that name to own. This module is the
 * equivalent seam — the single place that defines which formatting
 * commands the editor exposes — just as a plain config array rather
 * than a React component.
 */
export const journalEditorCommands: ICommand[] = [
    title,
    bold,
    italic,
    divider,
    quote,
    codeBlock,
    link,
    divider,
    unorderedListCommand,
    orderedListCommand,
    divider,
    table,
    hr,
];
