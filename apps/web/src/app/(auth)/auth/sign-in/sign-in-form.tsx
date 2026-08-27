"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { GoogleButton } from "@/components/google-button";
import { Button, Field, Input } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const showConfirmNotice = search.get("confirm") === "1";

  const [pending, start] = useTransition();
  const [resending, startResend] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendState, setResendState] =
    useState<null | "sent" | "already" | "error">(null);
  const [email, setEmail] = useState("");

  async function resendConfirmation() {
    setResendState(null);
    if (!email) {
      setError("Enter your email address first, then resend.");
      return;
    }
    startResend(async () => {
      const supabase = createSupabaseBrowserClient();
      const base =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${base}/auth/callback` },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already") && msg.includes("confirm")) {
          setResendState("already");
        } else {
          setResendState("error");
          setError(error.message);
        }
        return;
      }
      setResendState("sent");
    });
  }

  return (
    <div>
      {showConfirmNotice && (
        <div className="mb-6 border border-border bg-[color:var(--surface-2)] p-3 text-sm">
          Check your email to confirm your Raah account, then sign in.
        </div>
      )}
      <GoogleButton />
      <div className="my-6 flex items-center gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-[11px] uppercase tracking-widest text-muted-2">
          or continue with email
        </span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setNeedsConfirmation(false);
          setResendState(null);
          const form = new FormData(e.currentTarget);
          const emailValue = String(form.get("email") ?? "");
          const password = String(form.get("password") ?? "");
          setEmail(emailValue);
          start(async () => {
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.signInWithPassword({
              email: emailValue,
              password,
            });
            if (error) {
              const msg = error.message.toLowerCase();
              if (
                msg.includes("not confirmed") ||
                msg.includes("email not confirmed") ||
                (error as { code?: string }).code === "email_not_confirmed"
              ) {
                setNeedsConfirmation(true);
                setError("Your email hasn't been confirmed yet.");
              } else {
                setError(error.message);
              }
              return;
            }
            router.push("/account");
            router.refresh();
          });
        }}
      >
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        {error && (
          <p className="mb-3 text-sm text-[color:var(--danger)]">{error}</p>
        )}
        {needsConfirmation && (
          <div className="mb-4 border border-border bg-[color:var(--surface)] p-3 text-sm">
            <p className="text-foreground">
              We need to confirm your email address before you can sign in.
            </p>
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={resending}
              className="mt-2 text-sm underline underline-offset-4 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend confirmation email"}
            </button>
            {resendState === "sent" && (
              <p className="mt-2 text-xs text-[color:var(--success)]">
                Confirmation email sent. Check your inbox.
              </p>
            )}
            {resendState === "already" && (
              <p className="mt-2 text-xs text-muted">
                This email is already confirmed. Try signing in again.
              </p>
            )}
          </div>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
