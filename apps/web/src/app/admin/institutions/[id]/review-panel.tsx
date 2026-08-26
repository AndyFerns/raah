"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import type { VerificationStatus } from "@/lib/supabase/types";
import { decideInstitutionAction } from "./actions";

export function AdminReviewPanel({
  institutionId,
  currentStatus,
}: {
  institutionId: string;
  currentStatus: VerificationStatus;
}) {
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function apply(decision: VerificationStatus) {
    start(async () => {
      setError(null);
      const res = await decideInstitutionAction(
        institutionId,
        decision,
        notes.trim() || null
      );
      if ("error" in res) setError(res.error);
      else setNotes("");
    });
  }

  return (
    <div>
      <p className="text-sm text-muted">Current status</p>
      <p className="mt-1 text-sm font-medium">
        {currentStatus.replace("_", " ")}
      </p>

      <div className="mt-6">
        <label className="eyebrow block mb-2">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes recorded with the decision."
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => apply("verified")}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => apply("under_review")}
        >
          Mark under review
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => apply("pending")}
        >
          Request changes
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => apply("rejected")}
        >
          Reject
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => apply("suspended")}
          className="col-span-2"
        >
          Suspend
        </Button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-[color:var(--danger)]">{error}</p>
      )}
    </div>
  );
}
