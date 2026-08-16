/**
 * In-memory login rate limiter: locks out a given client IP after
 * repeated failed password attempts, plus a coarse global cap as a
 * backstop against an attempt spread across many IPs that individually
 * stay under the per-IP threshold.
 *
 * Deliberately in-process, single-instance state — no Redis or other
 * external store. This app is explicitly never scaled beyond one
 * always-on instance (see IMPLEMENTATION_PLAN.md and
 * gitOperationLock.ts, which relies on the same assumption), so a
 * module-scope Map is sufficient and a lockout survives exactly as long
 * as it should: until the process restarts.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_IP = 10;
const MAX_GLOBAL_FAILURES = 50;

interface FailureWindow {
    count: number;
    windowStartedAt: number;
    lockedUntil: number | null;
}

/** Whether `window` still matters: either its lockout hasn't expired, or its failure count is still within the counting window. */
function isActive(window: FailureWindow, now: number): boolean {
    return (window.lockedUntil !== null && window.lockedUntil > now) || now - window.windowStartedAt <= WINDOW_MS;
}

function isLockedOut(window: FailureWindow | undefined, now: number): boolean {
    return window !== undefined && window.lockedUntil !== null && window.lockedUntil > now;
}

/** Records one failure against `window` (starting a fresh one if the previous window/lockout has fully expired), locking out once `maxFailures` is exceeded. */
function recordFailure(window: FailureWindow | undefined, now: number, maxFailures: number): FailureWindow {
    const current: FailureWindow =
        window && isActive(window, now) ? window : { count: 0, windowStartedAt: now, lockedUntil: null };

    current.count += 1;

    if (current.count >= maxFailures) {
        current.lockedUntil = now + WINDOW_MS;
    }

    return current;
}

const failuresByIp = new Map<string, FailureWindow>();
let globalFailures: FailureWindow | undefined;

/** Drops per-IP entries that are neither locked nor within their counting window, so the map doesn't grow unbounded over the process's lifetime. */
function pruneExpiredEntries(now: number): void {
    for (const [ip, window] of failuresByIp) {
        if (!isActive(window, now)) {
            failuresByIp.delete(ip);
        }
    }
}

/** Whether `ip` (or the app as a whole, via the global backstop) is currently locked out of logging in. */
export function isLoginLockedOut(ip: string): boolean {
    const now = Date.now();
    return isLockedOut(globalFailures, now) || isLockedOut(failuresByIp.get(ip), now);
}

/** Records a failed login attempt from `ip` against both the per-IP and global counters. */
export function recordLoginFailure(ip: string): void {
    const now = Date.now();

    failuresByIp.set(ip, recordFailure(failuresByIp.get(ip), now, MAX_FAILURES_PER_IP));
    globalFailures = recordFailure(globalFailures, now, MAX_GLOBAL_FAILURES);

    pruneExpiredEntries(now);
}

/** Clears `ip`'s failure count after a successful login. The global backstop counter is left untouched — one IP succeeding doesn't undo a broader attack in progress. */
export function recordLoginSuccess(ip: string): void {
    failuresByIp.delete(ip);
}
