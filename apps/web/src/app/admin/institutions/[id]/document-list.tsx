"use client";

import { useState, useTransition } from "react";
import { adminSignedDocumentUrlAction } from "./actions";

type Doc = { id: string; name: string; path: string; size: number };

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminDocumentList({ documents }: { documents: Doc[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {documents.length === 0 && (
          <li className="py-3 text-sm text-muted">No documents submitted.</li>
        )}
        {documents.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm truncate">{d.name}</p>
              <p className="text-xs text-muted">{formatSize(d.size)}</p>
            </div>
            <button
              type="button"
              className="text-xs underline underline-offset-4"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await adminSignedDocumentUrlAction(d.path);
                  if ("ok" in res) window.open(res.url, "_blank");
                  else setError(res.error);
                })
              }
            >
              View
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p className="mt-3 text-sm text-[color:var(--danger)]">{error}</p>
      )}
    </div>
  );
}
