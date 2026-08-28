import { redirect } from "next/navigation";
import { requireSession, type SessionContext } from "./auth";
import { createSupabaseServerClient } from "./supabase/server";
import type {
  IndustryOrganization,
  IndustryProfile,
} from "./supabase/types";

export type IndustryContext = {
  session: SessionContext;
  organization: IndustryOrganization;
  isAdminMember: boolean;
  profile: IndustryProfile | null;
};

export async function getIndustryContext(): Promise<IndustryContext | null> {
  const session = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: membership } = await supabase
    .from("industry_organization_members")
    .select("role, status, industry_organizations(*)")
    .eq("user_id", session.userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const org = (membership as unknown as {
    role?: "admin" | "member";
    industry_organizations?: IndustryOrganization | null;
  })?.industry_organizations;

  if (!org) return null;

  const { data: profile } = await supabase
    .from("industry_profiles")
    .select("*")
    .eq("organization_id", org.id)
    .maybeSingle();

  return {
    session,
    organization: org,
    isAdminMember:
      (membership as unknown as { role: string }).role === "admin",
    profile: (profile as IndustryProfile | null) ?? null,
  };
}

export async function requireIndustryContext(): Promise<IndustryContext> {
  const ctx = await getIndustryContext();
  if (!ctx) redirect("/industry/onboarding");
  return ctx;
}
