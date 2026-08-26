"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { domainFromUrl, slugify } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InstitutionRegistrationSchema } from "@/lib/validation";

function normStr(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function registerInstitutionAction(
  formData: FormData
): Promise<{ ok: true; slug: string } | { error: string }> {
  const session = await requireSession();

  const parsed = InstitutionRegistrationSchema.safeParse({
    name: normStr(formData.get("name")) ?? "",
    type: normStr(formData.get("type")) ?? "",
    institution_code: normStr(formData.get("institution_code")),
    official_email: normStr(formData.get("official_email")),
    website: normStr(formData.get("website")),
    state: normStr(formData.get("state")),
    district: normStr(formData.get("district")),
    city: normStr(formData.get("city")),
    address: normStr(formData.get("address")),
    description: normStr(formData.get("description")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const supabase = await createSupabaseServerClient();

  const baseSlug = slugify(parsed.data.name) || "institution";
  let slug = baseSlug;
  for (let i = 0; i < 20; i++) {
    const { data: taken } = await supabase
      .from("institutions")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const official_domain = parsed.data.website
    ? domainFromUrl(parsed.data.website)
    : parsed.data.official_email
      ? parsed.data.official_email.split("@")[1]?.toLowerCase() ?? null
      : null;

  const { data: inserted, error } = await supabase
    .from("institutions")
    .insert({
      slug,
      name: parsed.data.name,
      type: parsed.data.type,
      institution_code: parsed.data.institution_code,
      official_email: parsed.data.official_email,
      website: parsed.data.website,
      official_domain,
      state: parsed.data.state,
      district: parsed.data.district,
      city: parsed.data.city,
      address: parsed.data.address,
      description: parsed.data.description,
      created_by: session.userId,
      verification_status: "pending",
    })
    .select("id, slug")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to create institution" };
  }

  const { error: memberErr } = await supabase.from("institution_members").insert({
    institution_id: inserted.id,
    user_id: session.userId,
    role: "admin",
  });
  if (memberErr) {
    return { error: memberErr.message };
  }

  // Ensure role is set to institution.
  await supabase
    .from("profiles")
    .update({ role: "institution", onboarded: true })
    .eq("id", session.userId);

  revalidatePath("/institution");
  return { ok: true, slug: inserted.slug };
}
