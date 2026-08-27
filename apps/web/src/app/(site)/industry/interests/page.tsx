import { Card, Container } from "@/components/ui";
import { requireIndustryContext } from "@/lib/industry";
import { InterestsForm } from "./form";

export const metadata = { title: "Industry interests — Raah" };

export default async function IndustryInterestsPage() {
  const ctx = await requireIndustryContext();
  return (
    <Container className="py-14 max-w-3xl">
      <p className="eyebrow mb-3">Industry interests</p>
      <h1 className="text-4xl font-semibold tracking-tight">
        What projects should we surface for {ctx.organization.name}?
      </h1>
      <p className="mt-2 text-muted max-w-xl">
        These preferences help match your organization with projects seeking
        industry collaboration. Structured entries improve future
        recommendations.
      </p>
      <Card className="mt-8 p-6">
        <InterestsForm profile={ctx.profile} />
      </Card>
    </Container>
  );
}
