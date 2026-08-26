"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteDocumentAction,
  recordDocumentAction,
  signedDocumentUrlAction,
} from "./actions";

type Doc = { id: string; name: string; size: number; path: string };

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({
  institutionId,
  documents,
}: {
  institutionId: string;
  documents: Doc[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {documents.length === 0 && (
          <li className="py-3 text-sm text-muted">No documents uploaded.</li>
        )}
        {documents.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm truncate">{d.name}</p>
              <p className="text-xs text-muted">{formatSize(d.size)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs underline underline-offset-4"
                onClick={() =>
                  start(async () => {
                    const res = await signedDocumentUrlAction(
                      institutionId,
                      d.path
                    );
                    if ("ok" in res) window.open(res.url, "_blank");
                    else setError(res.error);
                  })
                }
              >
                View
              </button>
              <button
                type="button"
                className="text-xs text-muted hover:text-[color:var(--danger)]"
                onClick={() =>
                  start(async () => {
                    const res = await deleteDocumentAction(
                      institutionId,
                      d.id
                    );
                    if ("error" in res) setError(res.error);
                  })
                }
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center gap-3">
        <label className="inline-flex items-center h-10 px-4 text-sm font-medium border border-border-strong bg-background hover:bg-surface cursor-pointer">
          {pending ? "Uploading…" : "Upload document"}
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              start(async () => {
                setError(null);
                const supabase = createSupabaseBrowserClient();
                const path = `${institutionId}/${Date.now()}-${file.name}`;
                const { error } = await supabase.storage
                  .from("verification-documents")
                  .upload(path, file, { upsert: false });
                if (error) {
                  setError(error.message);
                  return;
                }
                const res = await recordDocumentAction(
                  institutionId,
                  path,
                  file.name,
                  file.type,
                  file.size
                );
                if ("error" in res) setError(res.error);
              });
              e.currentTarget.value = "";
            }}
          />
        </label>
        <p className="text-xs text-muted">
          PDF, DOCX, XLSX or images. Stored privately.
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="hidden"
        disabled={pending}
      />
      {error && <p className="mt-3 text-sm text-[color:var(--danger)]">{error}</p>}
    </div>
  );
}
