"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SignOutIcon } from "./icons";

export function SignOutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onClick = () =>
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    });

  if (full) {
    return (
      <button
        onClick={onClick}
        className="w-full inline-flex items-center gap-3 h-10 px-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-2)] transition-colors text-sm text-foreground"
        disabled={pending}
      >
        <SignOutIcon size={16} />
        <span>{pending ? "Signing out…" : "Sign out"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-2)] transition-colors text-muted hover:text-foreground"
      aria-label="Sign out"
      title="Sign out"
      disabled={pending}
    >
      <SignOutIcon size={16} />
    </button>
  );
}
