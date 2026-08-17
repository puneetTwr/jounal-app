type AuthEventType = "success" | "failure" | "lockout";

/**
 * Logs an authentication event to stdout — timestamp, event type, and
 * client IP only. Never the password, TOTP code, cookie, or PAT. The
 * hosting platform's existing log viewer is enough to spot a burst of
 * failures/lockouts; no new logging infrastructure is needed for a
 * single-operator app.
 */
export function logAuthEvent(type: AuthEventType, clientIp: string): void {
    console.log(
        JSON.stringify({
            event: `auth.${type}`,
            ip: clientIp,
            timestamp: new Date().toISOString(),
        })
    );
}
