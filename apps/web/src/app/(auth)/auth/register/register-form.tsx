"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
              className="w-full text-left py-4 flex items-start justify-between gap-6 hover:bg-surface px-1"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {opt.label}
                </p>
                <p className="text-sm text-muted">{opt.description}</p>
              </div>
              <span className="text-sm text-muted mt-0.5">Select</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedLabel =
    roleOptions.find((r) => r.value === role)?.label ?? role;

  return (
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
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });
          if (error) {
            setError(error.message);
            return;
          }
          const userId = data.user?.id;
          if (userId) {
            await supabase
              .from("profiles")
              .update({ role, full_name: fullName })
              .eq("id", userId);
          }
          if (!data.session) {
            router.push("/auth/sign-in?confirm=1");
            return;
          }
          if (role === "institution") {
            router.push("/onboarding/institution");
          } else {
            router.push("/account");
          }
          router.refresh();
        });
      }}
    >
      <p className="eyebrow mb-4">Step 2 of 2 — {selectedLabel}</p>
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
  );
}
