"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FacultyInviteSchema } from "@/lib/validation";

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
  return supabase;
}

function s(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

export async function addFacultyAction(
  institutionId: string,
  formData: FormData
): Promise<{ ok: true; id: string } | { error: string }> {
  const supabase = await assertInstitutionAdmin(institutionId);
  const expertiseRaw = s(formData.get("expertise"));
  const expertise = expertiseRaw
    ? expertiseRaw.split(",").map((e) => e.trim()).filter(Boolean)
    : null;

  const parsed = FacultyInviteSchema.safeParse({
    full_name: s(formData.get("full_name")) ?? "",
    designation: s(formData.get("designation")),
    department: s(formData.get("department")),
    official_email: s(formData.get("official_email")) ?? "",
    expertise,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { data, error } = await supabase
    .from("faculty")
    .insert({
      institution_id: institutionId,
      full_name: parsed.data.full_name,
      designation: parsed.data.designation ?? null,
      department: parsed.data.department ?? null,
      official_email: parsed.data.official_email.toLowerCase(),
      expertise: parsed.data.expertise ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/institution/people");
  return { ok: true, id: data.id };
}

export async function removeFacultyAction(
  institutionId: string,
  facultyId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await assertInstitutionAdmin(institutionId);
  const { error } = await supabase
    .from("faculty")
    .delete()
    .eq("id", facultyId)
    .eq("institution_id", institutionId);
  if (error) return { error: error.message };
  revalidatePath("/institution/people");
  return { ok: true };
}

/**
 * Generates a verification token and returns the verification URL.
 * In production this should send an email; for the MVP the URL is returned to
 * the institution administrator so it can be shared with the faculty member.
 */
export async function sendFacultyInviteAction(
  institutionId: string,
  facultyId: string
): Promise<{ ok: true; url: string } | { error: string }> {
  const supabase = await assertInstitutionAdmin(institutionId);

  const { data: fac } = await supabase
    .from("faculty")
    .select("id, official_email, institution_id, institutions(official_domain)")
    .eq("id", facultyId)
    .maybeSingle();
  if (!fac || fac.institution_id !== institutionId) {
    return { error: "Faculty not found" };
  }

  const domain = (fac.institutions as unknown as { official_domain?: string | null })
    ?.official_domain;
  const emailDomain = fac.official_email.split("@")[1]?.toLowerCase();
  if (!domain || !emailDomain || emailDomain !== domain) {
    return {
      error:
        "Faculty email domain does not match the institution's official domain. Update the institution profile first.",
    };
  }

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Revoke previous outstanding invites for this faculty
  await supabase
    .from("faculty_verifications")
    .update({ status: "revoked" })
    .eq("faculty_id", facultyId)
    .in("status", ["pending", "sent"]);

  const { error } = await supabase.from("faculty_verifications").insert({
    faculty_id: facultyId,
    status: "sent",
    token,
    token_expires_at: expires,
    method: "email_domain",
    sent_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${base}/faculty-verify/${token}`;

  revalidatePath("/institution/people");
  return { ok: true, url };
}
