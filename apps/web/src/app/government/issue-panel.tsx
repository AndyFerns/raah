import Link from "next/link";
import { useState, useRef } from "react";
import type { IssueWithMedia, IssueStatus } from "./types";
import { STATUS_COLOR, STATUS_LABEL, CATEGORY_LABEL } from "./types";
import { updateIssueStatus } from "./actions";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function getMediaUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (storagePath.startsWith("http")) return storagePath;
  return `${supabaseUrl}/storage/v1/object/public/issue-media/${storagePath}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const VALID_TRANSITIONS: Record<string, IssueStatus[]> = {
  reported: ["acknowledged", "in_progress"],
  acknowledged: ["in_progress"],
  in_progress: ["resolved"],
  resolved: [],
  rejected: [],
  closed: [],
};

const REQUIRES_EVIDENCE: IssueStatus[] = ["in_progress", "resolved"];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function IssuePanel({
  issue,
  onClose,
  onIssueUpdated,
}: {
  issue: IssueWithMedia | null;
  onClose: () => void;
  onIssueUpdated?: (issue: IssueWithMedia) => void;
}) {
  const isOpen = issue !== null;

  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | "">("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableTransitions = issue
    ? VALID_TRANSITIONS[issue.status] ?? []
    : [];
  const canUpdate = availableTransitions.length > 0;

  function resetUpdateForm() {
    setIsUpdating(false);
    setSelectedStatus("");
    setSelectedFiles([]);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((file) =>
        file.type.startsWith("image/"),
      );
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!issue || !selectedStatus) return;

    if (
      REQUIRES_EVIDENCE.includes(selectedStatus as IssueStatus) &&
      selectedFiles.length === 0
    ) {
      setError(`Evidence images are required to mark as ${STATUS_LABEL[selectedStatus as IssueStatus]}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("issueId", issue.id);
    formData.append("newStatus", selectedStatus);
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      const result = await updateIssueStatus(formData);
      if (result.success) {
        if (onIssueUpdated) {
          onIssueUpdated(result.issue);
        }
        resetUpdateForm();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className={`issue-panel ${isOpen ? "issue-panel--open" : ""}`}>
        {!issue ? (
          /* ── Empty state ──────────────────────────────────── */
          <div className="issue-panel-empty">
            <div className="issue-panel-empty-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <p className="issue-panel-empty-text">
              Select an issue on the map to view details
            </p>
          </div>
        ) : (
          /* ── Issue detail ─────────────────────────────────── */
          <>
            {/* Header */}
            <div className="issue-panel-header">
              <span className="issue-panel-header-label">Issue Details</span>
              <button
                onClick={() => {
                  resetUpdateForm();
                  onClose();
                }}
                className="issue-panel-close"
                aria-label="Close panel"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="issue-panel-body">
              {/* Media */}
              {issue.issue_media?.filter((m) => m.type === "image").length >
                0 && (
                <div className="issue-panel-media">
                  {issue.issue_media
                    .filter((m) => m.type === "image")
                    .map((m) => (
                      <img
                        key={m.id}
                        src={getMediaUrl(m.storage_path)}
                        alt={m.original_name ?? "Issue image"}
                        className="issue-panel-media-img"
                      />
                    ))}
                </div>
              )}

              {/* Title (clickable → dedicated detail page) */}
              <h2 className="issue-panel-title">
                <Link
                  href={`/government/issues/${issue.id}`}
                  className="issue-panel-title-link"
                >
                  {issue.title}
                </Link>
              </h2>

              {/* Status + Category badges */}
              <div className="issue-panel-badges">
                <span
                  className="issue-panel-badge"
                  style={{
                    borderColor:
                      STATUS_COLOR[
                        issue.status as keyof typeof STATUS_COLOR
                      ],
                    color:
                      STATUS_COLOR[
                        issue.status as keyof typeof STATUS_COLOR
                      ],
                    background: `${STATUS_COLOR[issue.status as keyof typeof STATUS_COLOR]}18`,
                  }}
                >
                  <span
                    className="issue-panel-badge-dot"
                    style={{
                      background:
                        STATUS_COLOR[
                          issue.status as keyof typeof STATUS_COLOR
                        ],
                    }}
                  />
                  {STATUS_LABEL[issue.status as keyof typeof STATUS_LABEL] ??
                    issue.status}
                </span>
                <span className="issue-panel-badge issue-panel-badge--muted">
                  {CATEGORY_LABEL[
                    issue.category as keyof typeof CATEGORY_LABEL
                  ] ?? issue.category}
                </span>
              </div>

              {/* Description */}
              {issue.description && (
                <div className="issue-panel-section">
                  <p className="issue-panel-description">
                    {issue.description}
                  </p>
                </div>
              )}

              {/* Location */}
              <div className="issue-panel-section">
                <span className="issue-panel-section-label">Location</span>
                {issue.location_name && (
                  <p className="issue-panel-location-name">
                    {issue.location_name}
                  </p>
                )}
                <p className="issue-panel-coords">
                  {issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}
                </p>
              </div>

              {/* Meta row */}
              <div className="issue-panel-meta-grid">
                <div className="issue-panel-meta-item">
                  <span className="issue-panel-meta-value">
                    {issue.support_count}
                  </span>
                  <span className="issue-panel-meta-label">Supporters</span>
                </div>
                <div className="issue-panel-meta-item">
                  <span className="issue-panel-meta-value">
                    {issue.view_count}
                  </span>
                  <span className="issue-panel-meta-label">Views</span>
                </div>
                <div className="issue-panel-meta-item">
                  <span className="issue-panel-meta-value">
                    {timeAgo(issue.created_at)}
                  </span>
                  <span className="issue-panel-meta-label">Reported</span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="issue-panel-section">
                <span className="issue-panel-section-label">Timeline</span>
                <div className="issue-panel-timeline-row">
                  <span className="issue-panel-timeline-label">Created</span>
                  <span className="issue-panel-timeline-value">
                    {formatDate(issue.created_at)}
                  </span>
                </div>
                <div className="issue-panel-timeline-row">
                  <span className="issue-panel-timeline-label">
                    Last updated
                  </span>
                  <span className="issue-panel-timeline-value">
                    {formatDate(issue.updated_at)}
                  </span>
                </div>
              </div>

              {/* ID */}
              <div className="issue-panel-section">
                <span className="issue-panel-section-label">Issue ID</span>
                <p className="issue-panel-id">{issue.id}</p>
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="issue-panel-footer">
              {!isUpdating ? (
                canUpdate ? (
                  <button
                    className="issue-panel-action-btn issue-panel-action-btn--primary"
                    onClick={() => setIsUpdating(true)}
                  >
                    Update Issue Status
                  </button>
                ) : (
                  <>
                    <button className="issue-panel-action-btn" disabled>
                      Update Issue Status
                    </button>
                    <span className="issue-panel-action-hint">
                      This issue is in a terminal state and cannot be updated.
                    </span>
                  </>
                )
              ) : (
                <div className="issue-update-form">
                  <div className="issue-update-header">
                    <span className="issue-update-title">Update Status</span>
                    <button
                      onClick={resetUpdateForm}
                      className="issue-update-cancel"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </div>

                  {error && <div className="issue-update-error">{error}</div>}

                  <div className="issue-update-field">
                    <label>New Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) =>
                        setSelectedStatus(e.target.value as IssueStatus)
                      }
                      disabled={isSubmitting}
                      className="issue-update-select"
                    >
                      <option value="" disabled>
                        Select new status...
                      </option>
                      {availableTransitions.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="issue-update-field">
                    <label>
                      Evidence Images{" "}
                      {selectedStatus && REQUIRES_EVIDENCE.includes(selectedStatus as IssueStatus) ? (
                        <span>(Required)</span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>(Optional)</span>
                      )}
                    </label>
                    <div className="issue-update-files">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="issue-update-file-preview">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                          />
                          <button
                            onClick={() => removeFile(i)}
                            disabled={isSubmitting}
                            className="issue-update-file-remove"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      <button
                        className="issue-update-file-add"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                      >
                        + Add Image
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  <button
                    className="issue-panel-action-btn issue-panel-action-btn--primary issue-update-submit"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !selectedStatus}
                  >
                    {isSubmitting ? "Updating..." : "Confirm Update"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        /* ── Panel container (themed via RAAH tokens) ──────────── */
        .issue-panel {
          width: 0;
          min-width: 0;
          overflow: hidden;
          background: var(--surface);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition:
            width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          box-shadow: var(--shadow-lg);
        }

        .issue-panel--open {
          width: 420px;
          min-width: 420px;
        }

        @media (max-width: 768px) {
          .issue-panel--open {
            width: 100%;
            min-width: 100%;
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            z-index: 30;
          }
        }

        /* ── Empty state ───────────────────────────────────────── */
        .issue-panel-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          min-width: 420px;
        }

        .issue-panel-empty-icon {
          color: var(--muted-2);
          margin-bottom: 16px;
        }

        .issue-panel-empty-text {
          color: var(--muted);
          font-size: 13px;
          text-align: center;
          line-height: 1.5;
        }

        /* ── Header ────────────────────────────────────────────── */
        .issue-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          min-width: 420px;
        }

        .issue-panel-header-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .issue-panel-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 999px;
          color: var(--muted);
          cursor: pointer;
          transition: background 0.15s, color 0.15s, transform 0.15s;
        }

        .issue-panel-close:hover {
          background: var(--surface-2);
          color: var(--foreground);
        }
        .issue-panel-close:active {
          transform: scale(0.96);
        }

        /* ── Scrollable body ───────────────────────────────────── */
        .issue-panel-body {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 18px;
          min-width: 420px;
        }

        .issue-panel-body::-webkit-scrollbar {
          width: 6px;
        }
        .issue-panel-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .issue-panel-body::-webkit-scrollbar-thumb {
          background: var(--border-strong);
          border-radius: 999px;
        }

        /* ── Media ─────────────────────────────────────────────── */
        .issue-panel-media {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin-bottom: 18px;
          padding-bottom: 4px;
        }

        .issue-panel-media-img {
          width: 100%;
          max-height: 220px;
          object-fit: cover;
          border-radius: 14px;
          border: 1px solid var(--border);
          flex-shrink: 0;
        }

        .issue-panel-media-img:only-child {
          width: 100%;
        }

        .issue-panel-media-img:not(:only-child) {
          width: 180px;
          height: 130px;
        }

        /* ── Title ─────────────────────────────────────────────── */
        .issue-panel-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--foreground);
          line-height: 1.35;
          letter-spacing: -0.01em;
          margin: 0 0 12px 0;
        }
        .issue-panel-title-link {
          color: inherit;
          text-decoration: none;
          background-image: linear-gradient(var(--accent), var(--accent));
          background-repeat: no-repeat;
          background-position: 0 100%;
          background-size: 0 1px;
          transition: background-size 200ms ease, color 150ms ease;
        }
        .issue-panel-title-link:hover {
          color: var(--accent);
          background-size: 100% 1px;
        }
        .issue-panel-title-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
          border-radius: 4px;
        }

        /* ── Badges ────────────────────────────────────────────── */
        .issue-panel-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .issue-panel-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 26px;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border: 1px solid;
          border-radius: 999px;
          white-space: nowrap;
        }

        .issue-panel-badge--muted {
          border-color: var(--border);
          color: var(--muted);
          background: var(--surface-2);
        }

        .issue-panel-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── Sections ──────────────────────────────────────────── */
        .issue-panel-section {
          padding: 14px 0;
          border-top: 1px solid var(--border);
        }

        .issue-panel-section-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          color: var(--muted-2);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 8px;
        }

        .issue-panel-description {
          font-size: 14px;
          line-height: 1.65;
          color: var(--foreground);
          margin: 0;
          padding: 14px 16px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .issue-panel-location-name {
          font-size: 13px;
          color: var(--foreground);
          margin: 0 0 4px 0;
        }

        .issue-panel-coords {
          font-size: 11px;
          color: var(--muted-2);
          font-family: var(--font-mono);
          margin: 0;
        }

        /* ── Meta grid ─────────────────────────────────────────── */
        .issue-panel-meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 4px;
        }

        .issue-panel-meta-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 14px 8px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 14px;
        }

        .issue-panel-meta-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--foreground);
          font-variant-numeric: tabular-nums;
        }

        .issue-panel-meta-label {
          font-size: 10px;
          color: var(--muted-2);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin-top: 4px;
        }

        /* ── Timeline rows ─────────────────────────────────────── */
        .issue-panel-timeline-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .issue-panel-timeline-label {
          font-size: 12px;
          color: var(--muted);
        }

        .issue-panel-timeline-value {
          font-size: 12px;
          color: var(--foreground);
          font-variant-numeric: tabular-nums;
        }

        /* ── ID ────────────────────────────────────────────────── */
        .issue-panel-id {
          font-size: 11px;
          color: var(--muted-2);
          font-family: var(--font-mono);
          margin: 0;
          word-break: break-all;
        }

        /* ── Footer / Actions ──────────────────────────────────── */
        .issue-panel-footer {
          padding: 16px 18px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          min-width: 420px;
          background: var(--surface);
        }

        .issue-panel-action-btn {
          width: 100%;
          height: 42px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface-2);
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .issue-panel-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .issue-panel-action-btn--primary {
          background: var(--foreground);
          border-color: var(--foreground);
          color: var(--background);
        }

        .issue-panel-action-btn--primary:hover:not(:disabled) {
          opacity: 0.9;
        }

        .issue-panel-action-hint {
          display: block;
          text-align: center;
          font-size: 11px;
          color: var(--muted);
          margin-top: 8px;
        }

        /* ── Update Form ───────────────────────────────────────── */
        .issue-update-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .issue-update-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .issue-update-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--foreground);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .issue-update-cancel {
          background: transparent;
          border: none;
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
        }

        .issue-update-cancel:hover:not(:disabled) {
          color: var(--foreground);
        }

        .issue-update-error {
          padding: 10px 14px;
          background: var(--danger-soft);
          border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent);
          border-radius: 12px;
          color: var(--danger);
          font-size: 12px;
          line-height: 1.4;
        }

        .issue-update-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .issue-update-field label {
          font-size: 12px;
          color: var(--foreground);
          font-weight: 500;
        }

        .issue-update-field label span {
          color: var(--danger);
          font-size: 11px;
        }

        .issue-update-select {
          height: 40px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--foreground);
          padding: 0 12px;
          font-size: 13px;
          outline: none;
        }

        .issue-update-select:focus {
          border-color: var(--accent);
        }

        .issue-update-files {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .issue-update-file-preview {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
        }

        .issue-update-file-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .issue-update-file-remove {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(0,0,0,0.65);
          color: white;
          border: none;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          line-height: 1;
        }

        .issue-update-file-add {
          width: 64px;
          height: 64px;
          border-radius: 12px;
          background: var(--surface-2);
          border: 1px dashed var(--border-strong);
          color: var(--muted);
          font-size: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .issue-update-file-add:hover:not(:disabled) {
          background: var(--surface-3);
          color: var(--foreground);
          border-color: var(--accent);
        }

        .issue-update-submit {
          margin-top: 8px;
        }
      `}</style>
    </>
  );
}
