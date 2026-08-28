"use server";

import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import type { IssueWithMedia, IssueStatus } from "./types";

/* ------------------------------------------------------------------ */
/* Valid status transitions for government users                       */
/* ------------------------------------------------------------------ */

const VALID_TRANSITIONS: Record<string, IssueStatus[]> = {
  reported: ["acknowledged", "in_progress"],
  acknowledged: ["in_progress"],
  in_progress: ["resolved"],
  // Terminal states — no further transitions
  resolved: [],
  rejected: [],
  closed: [],
};

/* Statuses that require at least one evidence image */
const REQUIRES_EVIDENCE: IssueStatus[] = ["in_progress", "resolved"];

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type UpdateResult =
  | { success: true; issue: IssueWithMedia }
  | { success: false; error: string };

/* ------------------------------------------------------------------ */
/* Server Action: Update issue status with evidence images             */
/* ------------------------------------------------------------------ */

export async function updateIssueStatus(
  formData: FormData,
): Promise<UpdateResult> {
  const issueId = formData.get("issueId") as string | null;
  const newStatus = formData.get("newStatus") as IssueStatus | null;

  if (!issueId || !newStatus) {
    return { success: false, error: "Missing issueId or newStatus." };
  }

  /* ── Validate transition ──────────────────────────────────────── */

  // TEMPORARY: using service role client to bypass RLS while auth is bypassed on the frontend
  const supabase = createSupabaseServiceRoleClient();

  const { data: currentIssue, error: fetchError } = await supabase
    .from("issues")
    .select("id, status")
    .eq("id", issueId)
    .single();

  if (fetchError || !currentIssue) {
    return { success: false, error: "Issue not found." };
  }

  const allowed = VALID_TRANSITIONS[currentIssue.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from "${currentIssue.status}" to "${newStatus}".`,
    };
  }

  /* ── Collect files ────────────────────────────────────────────── */

  const files: File[] = [];
  const entries = formData.getAll("files");
  for (const entry of entries) {
    if (entry instanceof File && entry.size > 0) {
      files.push(entry);
    }
  }

  if (REQUIRES_EVIDENCE.includes(newStatus) && files.length === 0) {
    return {
      success: false,
      error: `At least one evidence image is required for "${newStatus}" status.`,
    };
  }

  /* ── Upload files to Supabase Storage ─────────────────────────── */

  const uploadedMedia: {
    storage_path: string;
    original_name: string;
    mime_type: string;
    type: "image" | "video";
    size_bytes: number;
  }[] = [];

  for (const file of files) {
    // Validate it is an image
    if (!file.type.startsWith("image/")) {
      return {
        success: false,
        error: `File "${file.name}" is not an image. Only image files are accepted.`,
      };
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `government/${issueId}/${timestamp}_${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("issue-media")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[GOV] Storage upload failed:", uploadError.message);
      return {
        success: false,
        error: `Failed to upload "${file.name}": ${uploadError.message}`,
      };
    }

    uploadedMedia.push({
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type,
      type: "image",
      size_bytes: file.size,
    });
  }

  /* ── Create issue_media rows ──────────────────────────────────── */

  if (uploadedMedia.length > 0) {
    const mediaRows = uploadedMedia.map((m) => ({
      issue_id: issueId,
      storage_path: m.storage_path,
      original_name: m.original_name,
      mime_type: m.mime_type,
      type: m.type,
      size_bytes: m.size_bytes,
    }));

    const { error: mediaInsertError } = await supabase
      .from("issue_media")
      .insert(mediaRows);

    if (mediaInsertError) {
      console.error("[GOV] issue_media insert failed:", mediaInsertError.message);
      return {
        success: false,
        error: `Failed to save media records: ${mediaInsertError.message}`,
      };
    }
  }

  /* ── Update issue status ──────────────────────────────────────── */

  const { error: updateError } = await supabase
    .from("issues")
    .update({ status: newStatus })
    .eq("id", issueId);

  if (updateError) {
    console.error("[GOV] Issue status update failed:", updateError.message);
    return {
      success: false,
      error: `Failed to update status: ${updateError.message}`,
    };
  }

  /* ── Re-fetch the full issue with media ───────────────────────── */

  const { data: updatedIssue, error: refetchError } = await supabase
    .from("issues")
    .select(
      `
      id,
      user_id,
      title,
      description,
      category,
      status,
      location_name,
      latitude,
      longitude,
      support_count,
      view_count,
      created_at,
      updated_at,
      issue_media (
        id,
        issue_id,
        storage_path,
        original_name,
        mime_type,
        type,
        size_bytes,
        created_at
      )
    `,
    )
    .eq("id", issueId)
    .single();

  if (refetchError || !updatedIssue) {
    // The status update DID succeed, but we can't fetch fresh data.
    // Return a partial success — the caller should still update locally.
    return {
      success: false,
      error: "Status updated but failed to reload issue data. Please refresh.",
    };
  }

  return { success: true, issue: updatedIssue as IssueWithMedia };
}
