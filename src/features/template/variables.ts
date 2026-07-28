const TEMPLATE_VARIABLE_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Replaces `{{variableName}}` placeholders in template content with the
 * corresponding value from `variables`. A placeholder whose name has no
 * matching entry in `variables` is left untouched rather than replaced
 * with an empty string — an unrecognized placeholder is far more
 * likely to be a typo worth noticing than a value that's genuinely
 * blank.
 *
 * Purely a string substitution: this module knows nothing about what
 * the variable names mean (title, journalDate, ...) — that mapping is
 * the caller's responsibility to build.
 */
export function applyTemplateVariables(content: string, variables: Record<string, string>): string {
    return content.replace(TEMPLATE_VARIABLE_PATTERN, (match, name: string) =>
        Object.prototype.hasOwnProperty.call(variables, name) ? variables[name] : match
    );
}
