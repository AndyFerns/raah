import { Card } from "@/components/ui";
import { SparkleIcon } from "@/components/icons";
import { requireIndustryContext } from "@/lib/industry";
import { InterestsForm } from "./form";

export const metadata = { title: "Interests — Industry" };

export default async function IndustryInterestsPage() {
  const ctx = await requireIndustryContext();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--accent-2-soft)] text-[color:var(--accent-2)] shrink-0">
          <SparkleIcon size={22} />
        </div>
        <div>
          <p className="eyebrow mb-1.5">Interests</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Tune your recommendations
          </h1>
          <p className="mt-2 text-muted max-w-xl">
            Structured entries help match{" "}
            <span className="text-foreground font-medium">
              {ctx.organization.name}
            </span>{" "}
            with the right projects. Everything below is used by future
            matching.
          </p>
        </div>
      </div>
      <Card className="p-6 md:p-8">
        <InterestsForm profile={ctx.profile} />
      </Card>
    </div>
  );
}
