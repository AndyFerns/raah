import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InstitutionRegistrationForm } from "./form";
import { InstitutionSearchForm } from "./search-form";

export const metadata = { title: "Register your institution — Raah" };

export default async function InstitutionOnboardingPage() {
  const session = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("institution_members")
    .select("institution_id, status, institutions(name, slug)")
    .eq("user_id", session.userId)
    .limit(1)
    .maybeSingle();

  if (existing?.status === "active") redirect("/institution");

  const pendingInst = existing?.status === "pending"
    ? (existing.institutions as unknown as { name: string; slug: string } | null)
    : null;

  return (
    <div className="min-h-screen">
      <Container className="py-14 max-w-3xl">
        <p className="eyebrow mb-3">Institution onboarding</p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Join or register your institution
        </h1>
        <p className="mt-2 text-muted max-w-xl">
          Search for your institution first. If it is already on Raah, request to
          join. Only register a new record if the institution is not yet listed.
        </p>

        {pendingInst && (
          <Card tone="warm" className="mt-8 p-6">
            <p className="eyebrow mb-2">Request pending</p>
            <p className="text-sm">
              Your request to join{" "}
              <span className="font-medium">{pendingInst.name}</span> is awaiting
              approval from an existing administrator.
            </p>
          </Card>
        )}

        <Card className="mt-8 p-6">
          <p className="eyebrow mb-4">Find an existing institution</p>
          <InstitutionSearchForm />
        </Card>

        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-1 h-px bg-border" />
            <span className="text-[11px] uppercase tracking-widest text-muted-2">
              or register a new institution
            </span>
            <span className="flex-1 h-px bg-border" />
          </div>
          <Card className="p-6">
            <p className="eyebrow mb-4">New institution</p>
            <InstitutionRegistrationForm />
          </Card>
        </div>
      </Container>
    </div>
  );
}
