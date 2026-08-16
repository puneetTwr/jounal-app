/**
 * Thrown by assertAuthenticated() when a Server Action is invoked
 * without a valid session cookie. Middleware already blocks
 * unauthenticated page loads, but Server Actions are independently
 * reachable HTTP endpoints — this is the check that holds even if
 * middleware, routing, or Next's action-bundling behavior ever changes.
 */
export class UnauthenticatedError extends Error {
    constructor() {
        super("This action requires an authenticated session.");
        this.name = "UnauthenticatedError";
        Object.freeze(this);
    }
}
