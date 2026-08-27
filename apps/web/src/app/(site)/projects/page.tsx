import Link from "next/link";
import {
  Card,
  Container,
  EmptyState,
  SectionTitle,
} from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROJECT_STAGE_LABEL,
  SUPPORT_TYPE_LABEL,
  type ProjectStage,
  type SupportOfferType,
} from "@/lib/supabase/types";

export const metadata = { title: "Projects — Raah" };

export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, domain, stage, progress, seeking_support, institutions(name, city, district)",
    )
    .eq("discoverable", true)
    .order("updated_at", { ascending: false })
    .limit(50);

  return (
    <Container className="py-14">
      <SectionTitle
        eyebrow="Projects"
        title="Projects open to collaboration"
        description="University-led projects seeking industry, mentorship, or funding support."
      />

      {(!projects || projects.length === 0) && (
        <div className="mt-8">
          <EmptyState
            title="No projects are currently seeking collaboration."
            description="Check back soon."
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(projects ?? []).map((p) => {
          const inst = (
            p as unknown as {
              institutions?: {
                name: string;
                city: string | null;
                district: string | null;
              } | null;
            }
          ).institutions;
          return (
            <Card key={p.id} className="p-5 flex flex-col">
              <p className="text-xs uppercase tracking-widest text-muted">
                {p.domain ?? "General"}
              </p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">
                {p.title}
              </h3>
              {inst && (
                <p className="mt-1 text-sm text-muted">
                  {inst.name}
                  {inst.city ? ` · ${inst.city}` : ""}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                <span>{PROJECT_STAGE_LABEL[p.stage as ProjectStage]}</span>
                <span className="tabular-nums">Progress {p.progress}%</span>
              </div>
              {p.seeking_support.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {p.seeking_support.map((s: string) => (
                    <li
                      key={s}
                      className="border border-border bg-background px-2 py-0.5 text-xs"
                    >
                      {SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-4">
                <Link
                  href={`/projects/${p.id}`}
                  className="text-sm underline underline-offset-4"
                >
                  View project
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
