"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { domainFromUrl } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InstitutionProfileSchema } from "@/lib/validation";

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

export async function updateInstitutionProfileAction(
  institutionId: string,
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  const supabase = await assertInstitutionAdmin(institutionId);

  const parsed = InstitutionProfileSchema.safeParse({
    name: s(formData.get("name")) ?? undefined,
    type: s(formData.get("type")) ?? undefined,
    institution_code: s(formData.get("institution_code")),
    official_email: s(formData.get("official_email")),
    website: s(formData.get("website")),
    state: s(formData.get("state")),
    district: s(formData.get("district")),
    city: s(formData.get("city")),
    address: s(formData.get("address")),
    description: s(formData.get("description")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.website) {
    patch.official_domain = domainFromUrl(parsed.data.website);
  } else if (parsed.data.official_email) {
    patch.official_domain =
      parsed.data.official_email.split("@")[1]?.toLowerCase() ?? null;
  }

  const { error } = await supabase
    .from("institutions")
    .update(patch)
    .eq("id", institutionId);
  if (error) return { error: error.message };

  revalidatePath("/institution");
  revalidatePath("/institution/profile");
  return { ok: true };
}

type ListKind = "departments" | "research_areas" | "capabilities" | "facilities";

const TABLE: Record<ListKind, { table: string; textCol: string; extra?: string[] }> = {
  departments: { table: "departments", textCol: "name" },
  research_areas: { table: "institution_research_areas", textCol: "area" },
  capabilities: { table: "institution_capabilities", textCol: "capability" },
  facilities: { table: "institution_facilities", textCol: "name", extra: ["description"] },
};

export async function addListItemAction(
  institutionId: string,
  kind: ListKind,
  label: string,
  sub?: string,
  facilityType?: string
): Promise<{ ok: true } | { error: string }> {
  if (!label.trim()) return { error: "Value required" };
  const supabase = await assertInstitutionAdmin(institutionId);
  const conf = TABLE[kind];
  const row: Record<string, unknown> = {
    institution_id: institutionId,
    [conf.textCol]: label.trim(),
  };
  if (kind === "facilities") {
    if (sub) row.description = sub.trim();
    if (facilityType) row.facility_type = facilityType;
  }
  const { error } = await supabase.from(conf.table).insert(row);
  if (error) return { error: error.message };
  revalidatePath("/institution/profile");
  return { ok: true };
}

export async function removeListItemAction(
  institutionId: string,
  kind: ListKind,
  id: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await assertInstitutionAdmin(institutionId);
  const conf = TABLE[kind];
  const { error } = await supabase
    .from(conf.table)
    .delete()
    .eq("id", id)
    .eq("institution_id", institutionId);
  if (error) return { error: error.message };
  revalidatePath("/institution/profile");
  return { ok: true };
}
