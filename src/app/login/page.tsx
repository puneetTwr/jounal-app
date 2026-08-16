import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components";

export const metadata: Metadata = {
    title: "Sign in — Journal",
};

interface LoginPageProps {
    searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const { next } = await searchParams;

    return (
        <main className="relative flex min-h-screen items-end justify-center overflow-hidden px-4 pb-[16vh] sm:pb-[18vh]">
            <div
                className="absolute inset-0 -z-10 bg-cover bg-center"
                style={{
                    // Just enough of a bottom vignette to guarantee the
                    // floating input stays readable — the image itself
                    // is left almost untouched everywhere else.
                    backgroundImage:
                        "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(6,4,3,0.4) 88%, rgba(6,4,3,0.55) 100%), url('/auth-background.png')",
                }}
                aria-hidden="true"
            />
            <LoginForm nextPath={next} />
        </main>
    );
}
