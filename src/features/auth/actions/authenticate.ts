"use server";

import { cookies } from "next/headers";

import { getAuthPassword, getSessionSecret, getTotpSecret } from "@/lib/config";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { getClientIp } from "@/lib/auth/getClientIp";
import { isLoginLockedOut, recordLoginFailure, recordLoginSuccess } from "@/lib/auth/loginRateLimiter";
import { isValidTotpCode } from "@/lib/auth/totp";

export interface AuthenticateResult {
    success: boolean;
    error?: string;
}

/**
 * Verifies the submitted password and TOTP code and, on success, starts
 * a session cookie. Both factors must match; the failure message never
 * says which one was wrong, so a caller who has guessed the password
 * can't use the response to confirm it before separately attacking the
 * TOTP code.
 *
 * Rate-limited per client IP (see loginRateLimiter.ts): a locked-out IP
 * is rejected before either factor is even compared, so lockout can't
 * be used as an oracle, and a locked-out caller can't keep accumulating
 * failures — including brute-forcing the 6-digit TOTP code once the
 * password alone is known — indefinitely.
 */
export async function authenticate(password: string, totpCode: string): Promise<AuthenticateResult> {
    const clientIp = await getClientIp();

    if (isLoginLockedOut(clientIp)) {
        return { success: false, error: "Too many attempts. Please try again later." };
    }

    const expectedPassword = getAuthPassword();
    const passwordMatches = password === expectedPassword;
    const totpMatches = passwordMatches && (await isValidTotpCode(totpCode, getTotpSecret()));

    if (!passwordMatches || !totpMatches) {
        recordLoginFailure(clientIp);
        return { success: false, error: "That password or code doesn't match." };
    }

    recordLoginSuccess(clientIp);

    const token = await createSessionToken(expectedPassword, getSessionSecret());
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return { success: true };
}
