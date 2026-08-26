"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function GoogleButton({
  label = "Continue with Google",
  next,
}: {
  label?: string;
  next?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const supabase = createSupabaseBrowserClient();
            const base =
              typeof window !== "undefined"
                ? window.location.origin
                : "";
            const redirectTo = `${base}/auth/callback${
              next ? `?next=${encodeURIComponent(next)}` : ""
            }`;
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo },
            });
            if (error) setError(error.message);
          })
        }
        className="w-full inline-flex items-center justify-center gap-3 h-10 px-4 text-sm font-medium border border-border-strong bg-background hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleGlyph />
        <span>{pending ? "Redirecting…" : label}</span>
      </button>
      {error && (
        <p className="mt-2 text-sm text-[color:var(--danger)]">{error}</p>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 48 48"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.4 30 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.7-.2-3.3-.5-4.9H24v9.3h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.5-4.2 7.1-10.3 7.1-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6c-.5-1.5-.8-3.1-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.7l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-10L2.6 34.7C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
