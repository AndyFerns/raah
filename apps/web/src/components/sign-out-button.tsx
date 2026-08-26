"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() =>
        start(async () => {
          const supabase = createSupabaseBrowserClient();
          await supabase.auth.signOut();
          router.push("/");
          router.refresh();
        })
      }
      className="text-sm text-muted hover:text-foreground"
      disabled={pending}
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
