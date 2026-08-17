const ALLOWED_URL_SCHEME_PATTERN = /^(https?:|mailto:|#)/i;

/**
 * Rejects any URL found in rendered journal Markdown whose scheme isn't
 * `http(s)`, `mailto`, or a same-page anchor (`#...`) — returning an
 * inert empty string instead of the original URL. Passed to every
 * surface that renders journal content as Markdown (the read-only view,
 * and defensively the editor's own preview, in case it's ever switched
 * out of its current `preview="edit"` mode), alongside `skipHtml`, to
 * close the raw-HTML/script-URL gap `@uiw/react-markdown-preview`
 * otherwise leaves open by including `rehype-raw` unconditionally.
 * See SECURITY_HARDENING_CHECKLIST.md item 12.
 */
export function safeMarkdownUrlTransform(url: string): string {
    return ALLOWED_URL_SCHEME_PATTERN.test(url) ? url : "";
}
