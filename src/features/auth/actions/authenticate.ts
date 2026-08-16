"use server";

import { cookies } from "next/headers";

import { getAuthPassword } from "@/lib/config";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export interface AuthenticateResult {
    success: boolean;
    error?: string;
}

/** Verifies the submitted password against the shared app password and, on success, starts a session cookie. */
export async function authenticate(password: string): Promise<AuthenticateResult> {
    const expectedPassword = getAuthPassword();

    if (password !== expectedPassword) {
        return { success: false, error: "That password doesn't match." };
    }

    const token = await createSessionToken(expectedPassword);
    const cookieStore = await cookies();

    // No `maxAge`/`expires`: this is a browser-session cookie by design,
    // so re-authentication is required every time a new session starts.
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });

    return { success: true };
}
