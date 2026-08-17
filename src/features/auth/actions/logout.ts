"use server";

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Clears the session cookie. Deliberately does not call
 * assertAuthenticated() first — logging out an already-unauthenticated
 * caller is a harmless no-op, not an error.
 */
export async function logout(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}
