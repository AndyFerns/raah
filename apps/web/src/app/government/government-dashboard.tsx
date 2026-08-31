"use client";

import { useState } from "react";
import type { IssueWithMedia } from "./types";
import { IssueMap } from "./issue-map";
import { IssuePanel } from "./issue-panel";

export function GovernmentDashboard({
  issues: initialIssues,
  fetchError,
}: {
  issues: IssueWithMedia[];
  fetchError: string | null;
}) {
  const [issues, setIssues] = useState<IssueWithMedia[]>(initialIssues);
  const [selectedIssue, setSelectedIssue] = useState<IssueWithMedia | null>(
    null,
  );

  /* ── Called after a successful status update ────────────────── */
  function handleIssueUpdated(updatedIssue: IssueWithMedia) {
    // Replace in the issues array so the map re-renders with new marker colors
    setIssues((prev) =>
      prev.map((i) => (i.id === updatedIssue.id ? updatedIssue : i)),
    );
    // Also update the selected issue so the panel shows fresh data
    setSelectedIssue(updatedIssue);
  }

  return (
    <div className="gov-dashboard">
      {/* ── Error banner ──────────────────────────────────────── */}
      {fetchError && (
        <div className="gov-error-banner">
          <span className="gov-error-icon">!</span>
          Failed to load issues: {fetchError}
        </div>
      )}

      {/* ── Map + Panel ───────────────────────────────────────── */}
      <div className="gov-content">
        <div className="gov-map-area">
          <IssueMap
            issues={issues}
            selectedIssueId={selectedIssue?.id ?? null}
            onSelectIssue={setSelectedIssue}
          />

          {/* ── Issue count overlay ───────────────────────────── */}
          <div className="gov-stats-overlay">
            <span className="gov-stats-count">{issues.length}</span>
            <span className="gov-stats-label">issues</span>
          </div>
        </div>

        <IssuePanel
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onIssueUpdated={handleIssueUpdated}
        />
      </div>

      <style>{`
        .gov-dashboard {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          background: var(--background);
          overflow: hidden;
        }

        .gov-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(239, 68, 68, 0.15);
          border-bottom: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          font-size: 13px;
          flex-shrink: 0;
        }

        .gov-error-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .gov-content {
          display: flex;
          flex: 1;
          min-height: 0;
          position: relative;
          overflow: hidden;
        }

        .gov-map-area {
          flex: 1;
          min-width: 0;
          position: relative;
          overflow: hidden;
        }

        .gov-stats-overlay {
          position: absolute;
          top: 24px;
          left: 84px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          padding: 8px 14px;
          background: color-mix(in srgb, var(--surface) 88%, transparent);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          border-radius: 999px;
          z-index: 5;
          pointer-events: none;
        }

        .gov-stats-count {
          font-size: 20px;
          font-weight: 700;
          color: var(--foreground);
          font-variant-numeric: tabular-nums;
        }

        .gov-stats-label {
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
      `}</style>
    </div>
  );
}
