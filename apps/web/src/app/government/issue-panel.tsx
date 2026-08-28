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

              {/* Title */}
              <h2 className="issue-panel-title">{issue.title}</h2>

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
        /* ── Panel container ───────────────────────────────────── */
        .issue-panel {
          width: 0;
          min-width: 0;
          overflow: hidden;
          background: #0f1421;
          border-left: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }

        .issue-panel--open {
          width: 400px;
          min-width: 400px;
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
          min-width: 400px;
        }

        .issue-panel-empty-icon {
          color: #334155;
          margin-bottom: 16px;
        }

        .issue-panel-empty-text {
          color: #475569;
          font-size: 13px;
          text-align: center;
          line-height: 1.5;
        }

        /* ── Header ────────────────────────────────────────────── */
        .issue-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
          min-width: 400px;
        }

        .issue-panel-header-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .issue-panel-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
          color: #94a3b8;
          cursor: pointer;
          transition: background 0.15s;
        }

        .issue-panel-close:hover {
          background: rgba(255,255,255,0.1);
          color: #e2e8f0;
        }

        /* ── Scrollable body ───────────────────────────────────── */
        .issue-panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          min-width: 400px;
        }

        .issue-panel-body::-webkit-scrollbar {
          width: 4px;
        }
        .issue-panel-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .issue-panel-body::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }

        /* ── Media ─────────────────────────────────────────────── */
        .issue-panel-media {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin-bottom: 16px;
          padding-bottom: 4px;
        }

        .issue-panel-media-img {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
        }

        .issue-panel-media-img:only-child {
          width: 100%;
        }

        .issue-panel-media-img:not(:only-child) {
          width: 160px;
          height: 120px;
        }

        /* ── Title ─────────────────────────────────────────────── */
        .issue-panel-title {
          font-size: 17px;
          font-weight: 600;
          color: #e2e8f0;
          line-height: 1.35;
          margin: 0 0 12px 0;
        }

        /* ── Badges ────────────────────────────────────────────── */
        .issue-panel-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .issue-panel-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 24px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border: 1px solid;
          border-radius: 3px;
          white-space: nowrap;
        }

        .issue-panel-badge--muted {
          border-color: rgba(255,255,255,0.12);
          color: #94a3b8;
          background: rgba(255,255,255,0.04);
        }

        .issue-panel-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ── Sections ──────────────────────────────────────────── */
        .issue-panel-section {
          padding: 12px 0;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .issue-panel-section-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 6px;
        }

        .issue-panel-description {
          font-size: 13px;
          line-height: 1.6;
          color: #94a3b8;
          margin: 0;
        }

        .issue-panel-location-name {
          font-size: 13px;
          color: #cbd5e1;
          margin: 0 0 2px 0;
        }

        .issue-panel-coords {
          font-size: 11px;
          color: #475569;
          font-family: var(--font-mono);
          margin: 0;
        }

        /* ── Meta grid ─────────────────────────────────────────── */
        .issue-panel-meta-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .issue-panel-meta-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 8px;
          background: #0f1421;
        }

        .issue-panel-meta-value {
          font-size: 15px;
          font-weight: 600;
          color: #e2e8f0;
          font-variant-numeric: tabular-nums;
        }

        .issue-panel-meta-label {
          font-size: 10px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 2px;
        }

        /* ── Timeline rows ─────────────────────────────────────── */
        .issue-panel-timeline-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }

        .issue-panel-timeline-label {
          font-size: 12px;
          color: #64748b;
        }

        .issue-panel-timeline-value {
          font-size: 12px;
          color: #94a3b8;
          font-variant-numeric: tabular-nums;
        }

        /* ── ID ────────────────────────────────────────────────── */
        .issue-panel-id {
          font-size: 11px;
          color: #475569;
          font-family: var(--font-mono);
          margin: 0;
          word-break: break-all;
        }

        /* ── Footer / Actions ──────────────────────────────────── */
        .issue-panel-footer {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
          min-width: 400px;
          background: #0f1421;
        }

        .issue-panel-action-btn {
          width: 100%;
          height: 38px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          background: rgba(255,255,255,0.04);
          color: #94a3b8;
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
          background: #3b82f6;
          border-color: #2563eb;
          color: white;
        }

        .issue-panel-action-btn--primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .issue-panel-action-hint {
          display: block;
          text-align: center;
          font-size: 11px;
          color: #64748b;
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
          color: #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .issue-update-cancel {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
        }

        .issue-update-cancel:hover:not(:disabled) {
          color: #e2e8f0;
        }

        .issue-update-error {
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 4px;
          color: #fca5a5;
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
          color: #cbd5e1;
          font-weight: 500;
        }

        .issue-update-field label span {
          color: #ef4444;
          font-size: 11px;
        }

        .issue-update-select {
          height: 38px;
          background: rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          color: white;
          padding: 0 12px;
          font-size: 13px;
          outline: none;
        }

        .issue-update-select:focus {
          border-color: #3b82f6;
        }

        .issue-update-files {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .issue-update-file-preview {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .issue-update-file-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .issue-update-file-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(0,0,0,0.7);
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
          width: 60px;
          height: 60px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
          border: 1px dashed rgba(255,255,255,0.2);
          color: #94a3b8;
          font-size: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .issue-update-file-add:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
          color: #e2e8f0;
          border-color: rgba(255,255,255,0.3);
        }

        .issue-update-submit {
          margin-top: 8px;
        }
      `}</style>
    </>
  );
}
