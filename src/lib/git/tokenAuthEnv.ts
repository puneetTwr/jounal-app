/**
 * Builds short-lived `GIT_CONFIG_*` environment variables that
 * authenticate a single `git` HTTP(S) operation (fetch or push) via a
 * Basic auth header carrying `token`. Passed as env for one child
 * process invocation only — never written to `.git/config`, never
 * exposed in this process's argv.
 */
export function buildTokenAuthEnv(token: string): Record<string, string> {
    const basicAuth = Buffer.from(`x-access-token:${token}`).toString("base64");

    return {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.extraheader",
        GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basicAuth}`,
    };
}
