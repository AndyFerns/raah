import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InstitutionRegistrationForm } from "./form";

export const metadata = { title: "Register your institution — Raah" };

export default async function InstitutionOnboardingPage() {
  const session = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("institution_members")
    .select("institution_id")
    .eq("user_id", session.userId)
    .limit(1)
    .maybeSingle();

  if (existing) redirect("/institution");

  return (
    <div className="min-h-screen">
      <Container className="py-14 max-w-3xl">
        <p className="eyebrow mb-3">Institution onboarding</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Register your institution
        </h1>
        <p className="mt-2 text-muted max-w-xl">
          Provide basic information about your institution. You will submit
          verification evidence in the next step.
        </p>
        <div className="mt-10">
          <InstitutionRegistrationForm />
        </div>
      </Container>
    </div>
  );
}
