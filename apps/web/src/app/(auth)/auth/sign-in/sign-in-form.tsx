"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GoogleButton } from "@/components/google-button";
import { Button, Field, Input } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
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
          const form = new FormData(e.currentTarget);
          const email = String(form.get("email") ?? "");
          const password = String(form.get("password") ?? "");
          start(async () => {
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (error) {
              setError(error.message);
              return;
            }
            router.push("/account");
            router.refresh();
          });
        }}
      >
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
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
          <p className="mb-4 text-sm text-[color:var(--danger)]">{error}</p>
        )}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
