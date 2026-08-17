import { describe, expect, it } from "vitest";
import { safeMarkdownUrlTransform } from "../safeMarkdownUrlTransform";

describe("safeMarkdownUrlTransform", () => {
    it.each([
        "https://example.com",
        "http://example.com/path?query=1",
        "mailto:someone@example.com",
        "#section-heading",
    ])("allows %s", (url) => {
        expect(safeMarkdownUrlTransform(url)).toBe(url);
    });

    it.each([
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "/relative/path",
        "relative/path",
    ])("rejects %s", (url) => {
        expect(safeMarkdownUrlTransform(url)).toBe("");
    });
});
