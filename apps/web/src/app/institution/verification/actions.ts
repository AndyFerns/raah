"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import type { VerificationStatus } from "@/lib/supabase/types";

async function assertInstitutionAdmin(institutionId: string) {
  const session = await requireSession();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("institution_members")
    .select("role")
    .eq("institution_id", institutionId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!data || data.role !== "admin") {
    throw new Error("Not authorized");
  }
  return { supabase, session };
}

export async function recordDocumentAction(
  institutionId: string,
  storagePath: string,
  originalName: string,
  mimeType: string,
  sizeBytes: number
): Promise<{ ok: true; id: string } | { error: string }> {
  const { supabase, session } = await assertInstitutionAdmin(institutionId);
  const { data, error } = await supabase
    .from("verification_documents")
    .insert({
      institution_id: institutionId,
      storage_path: storagePath,
      original_name: originalName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/institution/verification");
  return { ok: true, id: data.id };
}

export async function deleteDocumentAction(
  institutionId: string,
  documentId: string
): Promise<{ ok: true } | { error: string }> {
  const { supabase } = await assertInstitutionAdmin(institutionId);
  const { data: doc } = await supabase
    .from("verification_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { error: "Not found" };

  const admin = createSupabaseServiceRoleClient();
  await admin.storage.from("verification-documents").remove([doc.storage_path]);

  const { error } = await supabase
    .from("verification_documents")
    .delete()
    .eq("id", documentId);
  if (error) return { error: error.message };
  revalidatePath("/institution/verification");
  return { ok: true };
}

export async function signedDocumentUrlAction(
  institutionId: string,
  storagePath: string
): Promise<{ ok: true; url: string } | { error: string }> {
  await assertInstitutionAdmin(institutionId);
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.storage
    .from("verification-documents")
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data) return { error: error?.message ?? "Failed" };
  return { ok: true, url: data.signedUrl };
}

export async function submitForReviewAction(
  institutionId: string
): Promise<{ ok: true } | { error: string }> {
  const { supabase, session } = await assertInstitutionAdmin(institutionId);

  const patch: { verification_status: VerificationStatus } = {
    verification_status: "under_review",
  };
  const { error } = await supabase
    .from("institutions")
    .update(patch)
    .eq("id", institutionId);
  if (error) return { error: error.message };

  await supabase.from("institution_verifications").insert({
    institution_id: institutionId,
    reviewed_by: null,
    decision: null,
    notes: null,
    submitted_at: new Date().toISOString(),
  });

  // Touch session to satisfy type-checker; session is used to enforce admin.
  void session;

  revalidatePath("/institution/verification");
  revalidatePath("/institution");
  return { ok: true };
}
