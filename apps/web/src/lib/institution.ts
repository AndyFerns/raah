import { redirect } from "next/navigation";
import { requireSession } from "./auth";
import { createSupabaseServerClient } from "./supabase/server";
import type { Institution } from "./supabase/types";

export type InstitutionContext = {
  institution: Institution;
  isAdminMember: boolean;
};

export async function requireInstitutionMembership(): Promise<InstitutionContext> {
  const session = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: membership } = await supabase
    .from("institution_members")
    .select("role, status, institutions(*)")
    .eq("user_id", session.userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const inst = (membership as unknown as {
    role?: "admin" | "member";
    institutions?: Institution | null;
  })?.institutions;

  if (!inst) redirect("/onboarding/institution");

  return {
    institution: inst,
    isAdminMember: (membership as unknown as { role: string }).role === "admin",
  };
}
