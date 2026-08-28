import { redirect } from "next/navigation";
import { Card, Container } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { getIndustryContext } from "@/lib/industry";
import { OnboardingForm } from "./form";

export const metadata = { title: "Industry onboarding — Raah" };

export default async function IndustryOnboardingPage() {
  await requireSession();
  const existing = await getIndustryContext();
  if (existing) redirect("/industry");

  return (
    <Container className="py-14 max-w-3xl">
      <p className="eyebrow mb-3">Industry onboarding</p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Register your organization
      </h1>
      <p className="mt-2 text-muted max-w-xl">
        Register your startup, MSME, company, CSR arm, or research organization
        to discover projects on Raah where you can help.
      </p>
      <Card className="mt-8 p-6">
        <OnboardingForm />
      </Card>
    </Container>
  );
}
