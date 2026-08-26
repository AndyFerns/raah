"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GoogleButton } from "@/components/google-button";
import { Button, Field, Input } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppRole } from "@/lib/supabase/types";

type Option = { value: AppRole; label: string; description: string };

export function RegisterForm({
  roleOptions,
  initialRole,
}: {
  roleOptions: Option[];
  initialRole?: AppRole;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(initialRole ?? null);

  if (!role) {
    return (
      <div>
        <p className="eyebrow mb-4">Step 1 of 2 — Account type</p>
        <div className="divide-y divide-border border-y border-border">
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className="w-full text-left py-4 flex items-start justify-between gap-6 hover:bg-surface px-2 group"
            >
              <div className="flex items-start gap-3">
                <span className="mt-2 h-0.5 w-6 bg-[color:var(--accent)] opacity-60 group-hover:opacity-100 transition-opacity" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {opt.label}
                  </p>
                  <p className="text-sm text-muted">{opt.description}</p>
                </div>
              </div>
              <span className="text-sm text-[color:var(--accent)] mt-0.5">
                Select
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedLabel =
    roleOptions.find((r) => r.value === role)?.label ?? role;

  return (
    <div>
      <p className="eyebrow mb-4">Step 2 of 2 — {selectedLabel}</p>
      <GoogleButton
        label="Continue with Google"
        next={role === "institution" ? "/onboarding/institution" : "/account"}
      />
      <div className="my-6 flex items-center gap-3">
        <span className="flex-1 h-px bg-border" />
        <span className="text-[11px] uppercase tracking-widest text-muted-2">
          or use email
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
        const fullName = String(form.get("fullName") ?? "");
        start(async () => {
          const supabase = createSupabaseBrowserClient();
          const base =
            typeof window !== "undefined" ? window.location.origin : "";
          const nextPath =
            role === "institution" ? "/onboarding/institution" : "/account";
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, requested_role: role },
              emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            },
          });
          if (error) {
            setError(error.message);
            return;
          }
          const userId = data.user?.id;
          if (userId && data.session) {
            await supabase
              .from("profiles")
              .update({ role, full_name: fullName })
              .eq("id", userId);
          }
          if (!data.session) {
            router.push("/auth/sign-in?confirm=1");
            return;
          }
          router.push(nextPath);
          router.refresh();
        });
      }}
    >
      <Field label="Full name" htmlFor="fullName">
        <Input id="fullName" name="fullName" required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </Field>
      {error && (
        <p className="mb-4 text-sm text-[color:var(--danger)]">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
        <button
          type="button"
          onClick={() => setRole(null)}
          className="text-sm text-muted hover:text-foreground"
        >
          Change account type
        </button>
      </div>
    </form>
    </div>
  );
}
