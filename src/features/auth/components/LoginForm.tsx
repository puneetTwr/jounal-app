"use client";

import {
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";

import { authenticate } from "@/features/auth/actions";

interface LoginFormProps {
  nextPath?: string;
}

// The real (invisible) input renders the browser's native password mask
// glyph, while the overlay below renders "♥" — two different glyph shapes.
// A proportional font gives them different advance widths per character,
// so the two layers drift apart as you type. Forcing both onto the same
// fixed-width grid (the doubled "monospace, monospace" declaration pins
// every glyph, regardless of shape, to one cell width) keeps them in sync.
const monoStyle: CSSProperties = { fontFamily: "monospace, monospace" };

// Overrides the global `--accent` token (normally purple) for just this
// control, so the shared focus-visible ring picks up a warm amber tone
// here instead — no change to globals.css or any other screen.
const warmAccent = { "--accent": "#e0ac6b" } as CSSProperties;

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await authenticate(password, totpCode);

      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }

      router.replace(nextPath && nextPath.startsWith("/") ? nextPath : "/");
      router.refresh();
    });
  }

  return (
    <div style={warmAccent} className="flex flex-col items-center gap-3">
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <div className={`relative inline-block ${isPending ? "opacity-40" : ""}`}>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            disabled={isPending}
            style={monoStyle}
            className="w-48 border-b border-[#f4e6d2]/30 bg-transparent px-1 py-1.5 text-center text-lg text-transparent caret-[#f4e6d2] placeholder:text-[#f4e6d2]/35 focus:border-[#f4e6d2]/70"
          />
          {password.length > 0 && (
            <div
              aria-hidden="true"
              style={monoStyle}
              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap px-1 text-lg text-[#f4e6d2]"
            >
              {"♥".repeat(password.length)}
            </div>
          )}
        </div>

        <label htmlFor="totpCode" className="sr-only">
          Authenticator code
        </label>
        <input
          id="totpCode"
          name="totpCode"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          value={totpCode}
          onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          disabled={isPending}
          style={monoStyle}
          className={`mt-3 w-48 border-b border-[#f4e6d2]/30 bg-transparent px-1 py-1.5 text-center text-lg tracking-[0.3em] text-[#f4e6d2] placeholder:text-[#f4e6d2]/35 focus:border-[#f4e6d2]/70 ${isPending ? "opacity-40" : ""}`}
        />

        <button
          type="submit"
          disabled={isPending}
          className="mt-4 block w-full text-center text-xs uppercase tracking-[0.2em] text-[#f4e6d2]/70 transition hover:text-[#f4e6d2] disabled:opacity-40"
        >
          {isPending ? "Checking…" : "Sign in"}
        </button>
      </form>

      <div aria-live="polite" className="min-h-4">
        {error && <p className="text-xs text-[#e3a9a0]/90">{error}</p>}
      </div>
    </div>
  );
}
