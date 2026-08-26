"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StatusPill } from "@/components/ui";
import type { FacultyVerificationStatus } from "@/lib/supabase/types";
import { removeFacultyAction, sendFacultyInviteAction } from "./actions";

type Faculty = {
  id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  official_email: string;
};

type Verification = {
  status: string;
  token: string | null;
  sent_at: string | null;
  verified_at: string | null;
};

export function FacultyRow({
  institutionId,
  faculty,
  verification,
  institutionDomain,
  appUrl,
}: {
  institutionId: string;
  faculty: Faculty;
  verification: Verification | null;
  institutionDomain: string | null;
  appUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(
    verification?.token && verification.status === "sent"
      ? `${appUrl}/faculty-verify/${verification.token}`
      : null
  );

  const emailDomain = faculty.official_email.split("@")[1]?.toLowerCase();
  const domainMatch = Boolean(
    institutionDomain && emailDomain === institutionDomain
  );
  const status = (verification?.status ?? "pending") as FacultyVerificationStatus;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{faculty.full_name}</p>
        <p className="text-xs text-muted">
          {[faculty.designation, faculty.department].filter(Boolean).join(" · ") ||
            "Faculty member"}
        </p>
        <p className="text-xs font-mono text-muted mt-1">
          {faculty.official_email}
          {!domainMatch && (
            <span className="ml-2 text-[color:var(--warning)]">
              domain mismatch
            </span>
          )}
        </p>
        {inviteUrl && (
          <p className="mt-2 text-xs">
            <span className="text-muted">Verification link: </span>
            <a className="underline underline-offset-4 break-all" href={inviteUrl}>
              {inviteUrl}
            </a>
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-[color:var(--danger)]">{error}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <StatusPill status={status} />
        {status !== "verified" && (
          <button
            type="button"
            disabled={pending || !domainMatch}
            className="text-xs underline underline-offset-4 disabled:no-underline disabled:text-muted-2"
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await sendFacultyInviteAction(
                  institutionId,
                  faculty.id
                );
                if ("error" in res) setError(res.error);
                else {
                  setInviteUrl(res.url);
                  router.refresh();
                }
              })
            }
          >
            Send verification
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          className="text-xs text-muted hover:text-[color:var(--danger)]"
          onClick={() =>
            start(async () => {
              const res = await removeFacultyAction(institutionId, faculty.id);
              if ("error" in res) setError(res.error);
              else router.refresh();
            })
          }
        >
          Remove
        </button>
      </div>
    </div>
  );
}
