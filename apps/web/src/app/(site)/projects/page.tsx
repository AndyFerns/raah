import Link from "next/link";
import {
  Badge,
  Card,
  Chip,
  Container,
  EmptyState,
  ProgressBar,
  SectionTitle,
} from "@/components/ui";
import { ArrowRightIcon, BuildingIcon } from "@/components/icons";
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
    .limit(60);

  return (
    <Container className="py-10 md:py-14">
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
            <Card key={p.id} interactive className="p-5 flex flex-col group">
              <div className="flex items-start justify-between gap-3">
                <Chip>{p.domain ?? "General"}</Chip>
                <Badge tone="accent">
                  {PROJECT_STAGE_LABEL[p.stage as ProjectStage]}
                </Badge>
              </div>
              <h3 className="mt-3 text-base font-semibold tracking-tight leading-snug">
                {p.title}
              </h3>
              {inst && (
                <p className="mt-1 text-xs text-muted flex items-center gap-1.5">
                  <BuildingIcon size={12} />
                  {inst.name}
                  {inst.city ? ` · ${inst.city}` : ""}
                </p>
              )}
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-muted uppercase tracking-widest mb-1.5">
                  <span>Progress</span>
                  <span className="tabular-nums">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} tone="accent2" />
              </div>
              {p.seeking_support.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.seeking_support.slice(0, 3).map((s: string) => (
                    <Chip key={s}>
                      {SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s}
                    </Chip>
                  ))}
                  {p.seeking_support.length > 3 && (
                    <Chip>+{p.seeking_support.length - 3}</Chip>
                  )}
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-[color:var(--border)] flex items-center justify-between">
                <span className="text-xs text-muted">View project</span>
                <Link
                  href={`/projects/${p.id}`}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[color:var(--foreground)] text-[color:var(--background)] group-hover:translate-x-0.5 transition-transform"
                  aria-label={`Open ${p.title}`}
                >
                  <ArrowRightIcon size={14} />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
