"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { VerificationStatus } from "@/lib/supabase/types";
import { submitForReviewAction } from "./actions";

export function SubmitForReviewButton({
  institutionId,
  currentStatus,
}: {
  institutionId: string;
  currentStatus: VerificationStatus;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<{ ok?: boolean; error?: string }>({});

  if (currentStatus === "verified") {
    return (
      <p className="text-sm text-[color:var(--success)]">
        Verified by Raah administrators.
      </p>
    );
  }

  if (currentStatus === "under_review") {
    return (
      <p className="text-sm text-muted">
        Submitted for review. A Raah administrator will respond shortly.
      </p>
    );
  }

  return (
    <div>
      <Button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await submitForReviewAction(institutionId);
            if ("error" in res) setState({ error: res.error });
            else setState({ ok: true });
          })
        }
      >
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
      {state.error && (
        <p className="mt-2 text-sm text-[color:var(--danger)]">{state.error}</p>
      )}
    </div>
  );
}
