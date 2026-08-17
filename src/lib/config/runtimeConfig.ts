/**
 * Whether this process is running a production build
 * (`NODE_ENV === "production"`), consolidated into one helper so this
 * decision — which governs the session cookie's `Secure` flag and the
 * `Strict-Transport-Security` header — lives in exactly one place
 * instead of being inlined at each call site.
 *
 * Don't assume this is set correctly on a given host without verifying
 * it after deploying — see GO_LIVE_MANUAL_STEPS.md item 2.
 */
export function isProductionRuntime(): boolean {
    return process.env.NODE_ENV === "production";
}
