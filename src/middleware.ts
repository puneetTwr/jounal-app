import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAuthPassword, getSessionSecret } from "@/lib/config";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

const LOGIN_PATH = "/login";

/** Paths that must stay reachable without a session, so the login screen itself can load. */
function isPublicPath(pathname: string): boolean {
    return pathname === LOGIN_PATH || pathname === "/auth-background.png";
}

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authenticated = await isValidSessionToken(token, getAuthPassword(), getSessionSecret());

    if (authenticated) {
        return NextResponse.next();
    }

    const loginUrl = new URL(LOGIN_PATH, request.url);
    const nextPath = `${pathname}${search}`;

    if (nextPath !== "/") {
        loginUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(loginUrl);
}

export const config = {
    // Runs on every request except Next's own internal asset routes.
    // Exclusions specific to this app (the login page, the background
    // image) are handled in code above via `isPublicPath`, not here —
    // this matcher stays the plain, well-known Next.js pattern.
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
