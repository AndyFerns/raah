"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function confirmFacultyAffiliationAction(
  token: string
): Promise<{ ok: true } | { error: string }> {
  if (!token || token.length < 20) return { error: "Invalid token" };
  const admin = createSupabaseServiceRoleClient();

  const { data: verif } = await admin
    .from("faculty_verifications")
    .select("id, faculty_id, status, token_expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!verif) return { error: "Invalid link" };
  if (verif.status === "verified") return { ok: true };
  if (
    verif.token_expires_at &&
    new Date(verif.token_expires_at).getTime() < Date.now()
  ) {
    await admin
      .from("faculty_verifications")
      .update({ status: "expired" })
      .eq("id", verif.id);
    return { error: "This verification link has expired." };
  }

  const { error } = await admin
    .from("faculty_verifications")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
    })
    .eq("id", verif.id);
  if (error) return { error: error.message };

  revalidatePath("/institution/people");
  revalidatePath("/institution");
  return { ok: true };
}
