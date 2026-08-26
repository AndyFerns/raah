"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { VerificationStatus } from "@/lib/supabase/types";

const ALLOWED: VerificationStatus[] = [
  "under_review",
  "verified",
  "rejected",
  "suspended",
  "pending",
];

export async function decideInstitutionAction(
  institutionId: string,
  decision: VerificationStatus,
  notes: string | null
): Promise<{ ok: true } | { error: string }> {
  const session = await requireAdmin();
  if (!ALLOWED.includes(decision)) return { error: "Invalid decision" };

  const admin = createSupabaseServiceRoleClient();

  const patch: {
    verification_status: VerificationStatus;
    verified_at: string | null;
  } = {
    verification_status: decision,
    verified_at: decision === "verified" ? new Date().toISOString() : null,
  };

  const { error } = await admin
    .from("institutions")
    .update(patch)
    .eq("id", institutionId);
  if (error) return { error: error.message };

  await admin.from("institution_verifications").insert({
    institution_id: institutionId,
    reviewed_by: session.userId,
    reviewed_at: new Date().toISOString(),
    decision,
    notes,
  });

  revalidatePath(`/admin/institutions/${institutionId}`);
  revalidatePath("/admin");
  revalidatePath("/institutions");
  return { ok: true };
}

export async function adminSignedDocumentUrlAction(
  storagePath: string
): Promise<{ ok: true; url: string } | { error: string }> {
  await requireAdmin();
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.storage
    .from("verification-documents")
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data) return { error: error?.message ?? "Failed" };
  return { ok: true, url: data.signedUrl };
}
