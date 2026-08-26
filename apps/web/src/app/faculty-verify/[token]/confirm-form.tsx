"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { confirmFacultyAffiliationAction } from "./actions";

export function ConfirmForm({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok?: boolean; error?: string }>({});

  if (state.ok) {
    return (
      <p className="text-sm text-[color:var(--success)]">
        Faculty affiliation verified. You can close this page.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await confirmFacultyAffiliationAction(token);
          if ("error" in res) setState({ error: res.error });
          else setState({ ok: true });
        });
      }}
    >
      <Button type="submit" disabled={pending}>
        {pending ? "Confirming…" : "Confirm affiliation"}
      </Button>
      {state.error && (
        <p className="mt-3 text-sm text-[color:var(--danger)]">{state.error}</p>
      )}
    </form>
  );
}
