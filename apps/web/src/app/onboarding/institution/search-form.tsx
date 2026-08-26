"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Input, StatusPill } from "@/components/ui";
import { INSTITUTION_TYPE_LABEL } from "@/lib/supabase/types";
import {
  requestInstitutionMembershipAction,
  searchInstitutionsAction,
} from "./actions";

type Result = {
  id: string;
  slug: string;
  name: string;
  type: string;
  city: string | null;
  district: string | null;
  verification_status: string;
};

export function InstitutionSearchForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState<Record<string, "pending" | "active">>({});

  function runSearch() {
    setError(null);
    start(async () => {
      const res = await searchInstitutionsAction(q);
      if ("error" in res) setError(res.error);
      else setResults(res.results);
    });
  }

  function requestJoin(id: string) {
    setError(null);
    start(async () => {
      const res = await requestInstitutionMembershipAction(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setRequested((prev) => ({ ...prev, [id]: res.status }));
      if (res.status === "active") router.push("/institution");
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="Search by institution name"
        />
        <Button type="button" variant="secondary" onClick={runSearch} disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-[color:var(--danger)]">{error}</p>}
      {results !== null && results.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          No matching institution found. Register a new one below.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {results.map((r) => {
            const state = requested[r.id];
            return (
              <li
                key={r.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">{r.name}</p>
                    <StatusPill
                      status={
                        r.verification_status as
                          | "pending"
                          | "under_review"
                          | "verified"
                          | "rejected"
                          | "suspended"
                      }
                    />
                  </div>
                  <p className="text-xs text-muted">
                    {INSTITUTION_TYPE_LABEL[
                      r.type as keyof typeof INSTITUTION_TYPE_LABEL
                    ] ?? r.type}
                    {(r.city || r.district) &&
                      ` · ${[r.city, r.district].filter(Boolean).join(", ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {state === "pending" ? (
                    <span className="text-xs text-muted">Request pending</span>
                  ) : state === "active" ? (
                    <span className="text-xs text-[color:var(--success)]">Joined</span>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() => requestJoin(r.id)}
                    >
                      Request to join
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted-2">
        Selecting an institution does not grant administrator access. An existing
        administrator must approve the request.
      </p>
    </div>
  );
}
