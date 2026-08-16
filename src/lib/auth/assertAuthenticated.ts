import { cookies } from "next/headers";
import { getAuthPassword, getSessionSecret } from "@/lib/config";
import { UnauthenticatedError } from "./errors";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "./session";

/**
 * Throws UnauthenticatedError unless the request carries a valid
 * session cookie. Every Server Action except `authenticate` (and a
 * future `logout`) must call this first, so the app's access control
 * does not rest on middleware alone — middleware covers plain page
 * GETs, but Server Actions are independently reachable and must verify
 * the session themselves.
 */
export async function assertAuthenticated(): Promise<void> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!(await isValidSessionToken(token, getAuthPassword(), getSessionSecret()))) {
        throw new UnauthenticatedError();
    }
}
