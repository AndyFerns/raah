"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { requireIndustryContext } from "@/lib/industry";
import { slugify } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { IndustryOrganizationType } from "@/lib/supabase/types";
import {
  IndustryOrganizationSchema,
  IndustryProfileSchema,
  SupportOfferSchema,
} from "@/lib/validation";

function normStr(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function getAll(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

function parseNumber(v: FormDataEntryValue | null): number | null {
  const s = normStr(v);
  if (!s) return null;
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export async function registerIndustryOrganizationAction(
  formData: FormData,
): Promise<{ ok: true; slug: string } | { error: string }> {
  const session = await requireSession();

  const parsed = IndustryOrganizationSchema.safeParse({
    name: normStr(formData.get("name")) ?? "",
    type: (normStr(formData.get("type")) ?? "startup") as IndustryOrganizationType,
    website: normStr(formData.get("website")),
    official_email: normStr(formData.get("official_email")) ?? "",
    state: normStr(formData.get("state")),
    district: normStr(formData.get("district")),
    city: normStr(formData.get("city")),
    description: normStr(formData.get("description")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const supabase = await createSupabaseServerClient();

  const baseSlug = slugify(parsed.data.name) || "org";
  let slug = baseSlug;
  for (let i = 0; i < 20; i++) {
    const { data: taken } = await supabase
      .from("industry_organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!taken) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: inserted, error } = await supabase
    .from("industry_organizations")
    .insert({
      slug,
      name: parsed.data.name,
      type: parsed.data.type,
      website: parsed.data.website ?? null,
      official_email: parsed.data.official_email || null,
      state: parsed.data.state ?? null,
      district: parsed.data.district ?? null,
      city: parsed.data.city ?? null,
      description: parsed.data.description ?? null,
      created_by: session.userId,
      verification_status: "pending",
    })
    .select("id, slug")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to create organization" };
  }

  const { error: memberErr } = await supabase
    .from("industry_organization_members")
    .insert({
      organization_id: inserted.id,
      user_id: session.userId,
      role: "admin",
      status: "active",
    });
  if (memberErr) return { error: memberErr.message };

  // Only bump role to industry if the user has not chosen a more specific one.
  const nextRole =
    session.profile.role === "csr" || session.profile.role === "research_org"
      ? session.profile.role
      : "industry";

  await supabase
    .from("profiles")
    .update({ role: nextRole, onboarded: true })
    .eq("id", session.userId);

  revalidatePath("/industry");
  return { ok: true, slug: inserted.slug };
}

export async function saveIndustryProfileAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireIndustryContext();

  const parsed = IndustryProfileSchema.safeParse({
    scope_domains: getAll(formData, "scope_domains"),
    expertise: getAll(formData, "expertise"),
    support_capabilities: getAll(formData, "support_capabilities"),
    investment_interest:
      normStr(formData.get("investment_interest")) ?? "not_interested",
    investment_range_min: parseNumber(formData.get("investment_range_min")),
    investment_range_max: parseNumber(formData.get("investment_range_max")),
    preferred_locations: getAll(formData, "preferred_locations"),
    notes: normStr(formData.get("notes")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("industry_profiles").upsert(
    {
      organization_id: ctx.organization.id,
      ...parsed.data,
    },
    { onConflict: "organization_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/industry");
  revalidatePath("/industry/interests");
  return { ok: true };
}

export async function submitSupportOfferAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireIndustryContext();

  const parsed = SupportOfferSchema.safeParse({
    project_id: normStr(formData.get("project_id")) ?? "",
    support_type: normStr(formData.get("support_type")) ?? "technical_support",
    description: normStr(formData.get("description")),
    expected_involvement: normStr(formData.get("expected_involvement")),
    duration: normStr(formData.get("duration")),
    funding_type: normStr(formData.get("funding_type")),
    funding_amount_min: parseNumber(formData.get("funding_amount_min")),
    funding_amount_max: parseNumber(formData.get("funding_amount_max")),
    funding_conditions: normStr(formData.get("funding_conditions")),
    mentor_name: normStr(formData.get("mentor_name")),
    mentor_expertise: normStr(formData.get("mentor_expertise")),
    mentor_availability: normStr(formData.get("mentor_availability")),
    engagement_mode: normStr(formData.get("engagement_mode")),
    contact_person: normStr(formData.get("contact_person")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_support_offers").insert({
    ...parsed.data,
    organization_id: ctx.organization.id,
    created_by: ctx.session.userId,
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath("/industry");
  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { ok: true };
}

export async function withdrawSupportOfferAction(
  offerId: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireIndustryContext();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_support_offers")
    .update({ status: "withdrawn" })
    .eq("id", offerId)
    .eq("organization_id", ctx.organization.id);
  if (error) return { error: error.message };
  revalidatePath("/industry");
  return { ok: true };
}
