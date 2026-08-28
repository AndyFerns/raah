import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { HandshakeIcon } from "@/components/icons";
import { requireSession } from "@/lib/auth";
import { getIndustryContext } from "@/lib/industry";
import { OnboardingForm } from "./form";

export const metadata = { title: "Set up organization — Industry" };

export default async function IndustryOnboardingPage() {
  await requireSession();
  const existing = await getIndustryContext();
  if (existing) redirect("/industry");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)] shrink-0">
          <HandshakeIcon size={22} />
        </div>
        <div>
          <p className="eyebrow mb-1.5">Onboarding</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Register your organization
          </h1>
          <p className="mt-2 text-muted max-w-xl">
            Register your startup, MSME, company, CSR arm, or research
            organization to start discovering projects on Raah.
          </p>
        </div>
      </div>
      <Card className="p-6 md:p-8">
        <OnboardingForm />
      </Card>
    </div>
  );
}
