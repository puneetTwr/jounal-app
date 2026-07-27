import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface JournalMarkdownProps {
    content: string;
}

/**
 * Element styling for the rendered Markdown body. Headings start at h2
 * (not h1): the page's own h1 is the entry title, rendered separately
 * by JournalMetadata, so the body's heading levels are shifted down one
 * to keep a single coherent document outline.
 *
 * Every override destructures `node` (react-markdown's hast AST node,
 * passed to every component) out of props before spreading the rest —
 * otherwise it lands on the native DOM element as a stray
 * `node="[object Object]"` attribute.
 *
 * `pre`'s `[&>code]` override resets its direct `code` child's
 * background/padding, so a fenced code block doesn't also pick up the
 * inline-code pill styling nested inside it.
 */
const markdownComponents: Components = {
    h1: ({ node: _node, ...props }) => <h2 className="mt-6 mb-2 text-xl font-bold first:mt-0" {...props} />,
    h2: ({ node: _node, ...props }) => <h3 className="mt-5 mb-2 text-lg font-semibold first:mt-0" {...props} />,
    h3: ({ node: _node, ...props }) => <h4 className="mt-4 mb-2 text-base font-semibold first:mt-0" {...props} />,
    h4: ({ node: _node, ...props }) => <h5 className="mt-4 mb-1 text-base font-semibold first:mt-0" {...props} />,
    h5: ({ node: _node, ...props }) => <h6 className="mt-3 mb-1 text-sm font-semibold first:mt-0" {...props} />,
    h6: ({ node: _node, ...props }) => <h6 className="mt-3 mb-1 text-sm font-semibold first:mt-0" {...props} />,
    p: ({ node: _node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
    ul: ({ node: _node, ...props }) => <ul className="mb-3 list-disc pl-6" {...props} />,
    ol: ({ node: _node, ...props }) => <ol className="mb-3 list-decimal pl-6" {...props} />,
    li: ({ node: _node, ...props }) => <li className="mb-1" {...props} />,
    blockquote: ({ node: _node, ...props }) => (
        <blockquote
            className="mb-3 border-l-4 border-black/20 pl-4 italic text-black/70 dark:border-white/20 dark:text-white/70"
            {...props}
        />
    ),
    code: ({ node: _node, ...props }) => (
        <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-sm dark:bg-white/10" {...props} />
    ),
    pre: ({ node: _node, ...props }) => (
        <pre
            className="mb-3 overflow-x-auto rounded-lg bg-black/5 p-3 font-mono text-sm dark:bg-white/10 [&>code]:bg-transparent [&>code]:p-0"
            {...props}
        />
    ),
    a: ({ node: _node, ...props }) => (
        <a
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:no-underline"
            {...props}
        />
    ),
    table: ({ node: _node, ...props }) => (
        <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm" {...props} />
        </div>
    ),
    thead: ({ node: _node, ...props }) => <thead className="border-b border-black/10 dark:border-white/15" {...props} />,
    th: ({ node: _node, ...props }) => <th className="px-2 py-1 text-left font-semibold" {...props} />,
    td: ({ node: _node, ...props }) => <td className="border-t border-black/5 px-2 py-1 dark:border-white/10" {...props} />,
};

/**
 * Renders a journal entry's Markdown body as read-only content.
 * react-markdown parses the source itself and only ever emits the
 * elements above — it never renders embedded raw HTML unless the
 * rehype-raw plugin is added, which it deliberately is not, so
 * arbitrary HTML in a journal body cannot execute.
 *
 * If the body is empty, a plain empty-state message is shown instead;
 * no placeholder Markdown is ever written back to the entry.
 */
export function JournalMarkdown({ content }: JournalMarkdownProps) {
    if (content.trim().length === 0) {
        return <p className="text-black/60 italic dark:text-white/60">This journal entry has no content yet.</p>;
    }

    return (
        <div>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
