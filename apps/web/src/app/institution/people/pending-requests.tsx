"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { approveMembershipAction, rejectMembershipAction } from "./actions";

type PendingRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export function PendingRequests({
  institutionId,
  initial,
}: {
  institutionId: string;
  initial: PendingRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(userId: string, decision: "approve" | "reject") {
    start(async () => {
      setError(null);
      const res =
        decision === "approve"
          ? await approveMembershipAction(institutionId, userId)
          : await rejectMembershipAction(institutionId, userId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRows((prev) => prev.filter((r) => r.user_id !== userId));
    });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No pending requests.</p>;
  }
  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((r) => (
          <li
            key={r.user_id}
            className="py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-medium">{r.full_name ?? "Unnamed user"}</p>
              {r.email && (
                <p className="text-xs text-muted font-mono">{r.email}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => act(r.user_id, "reject")}
                disabled={pending}
              >
                Reject
              </Button>
              <Button
                type="button"
                onClick={() => act(r.user_id, "approve")}
                disabled={pending}
              >
                Approve
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-2 text-sm text-[color:var(--danger)]">{error}</p>
      )}
    </div>
  );
}
