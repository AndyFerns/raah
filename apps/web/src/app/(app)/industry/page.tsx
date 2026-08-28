import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  Container,
  EmptyState,
  LinkButton,
  SectionTitle,
  StatusPill,
} from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { getIndustryContext } from "@/lib/industry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  COLLABORATION_STATUS_LABEL,
  INDUSTRY_ORG_TYPE_LABEL,
  PROJECT_STAGE_LABEL,
  SUPPORT_TYPE_LABEL,
  type CollaborationStatus,
  type Project,
  type ProjectStage,
  type SupportOfferType,
} from "@/lib/supabase/types";

export const metadata = { title: "Industry — Raah" };

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function IndustryDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const ctx = await getIndustryContext();
  if (!ctx) redirect("/industry/onboarding");

  const { organization, profile } = ctx;
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  const domain = firstParam(params.domain);
  const support = firstParam(params.support);
  const stage = firstParam(params.stage) as ProjectStage | null;
  const q = firstParam(params.q);

  let query = supabase
    .from("projects")
    .select(
      "id, title, problem_statement, domain, state, district, city, stage, progress, seeking_support, required_expertise, collaboration_types, institution_id, institutions(name, slug, city, district)",
    )
    .eq("discoverable", true)
    .in("status", ["active", "on_hold"])
    .order("updated_at", { ascending: false })
    .limit(24);

  if (domain) query = query.eq("domain", domain);
  if (stage) query = query.eq("stage", stage);
  if (support) query = query.contains("seeking_support", [support]);
  if (q && q.length >= 2) query = query.ilike("title", `%${q}%`);

  const { data: projects } = await query;

  const { data: offers } = await supabase
    .from("project_support_offers")
    .select(
      "id, project_id, support_type, status, updated_at, projects(title)",
    )
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  const profileComplete = profile
    ? [
        profile.scope_domains.length > 0,
        profile.expertise.length > 0,
        profile.support_capabilities.length > 0,
      ].filter(Boolean).length
    : 0;

  return (
    <Container className="py-14">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">
            {INDUSTRY_ORG_TYPE_LABEL[organization.type]} · Industry portal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {organization.name}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <StatusPill status={organization.verification_status} />
            {organization.city && (
              <span className="text-sm text-muted">
                {organization.city}
                {organization.district ? `, ${organization.district}` : ""}
              </span>
            )}
            <span className="text-xs text-muted-2 uppercase tracking-wider">
              Profile {profileComplete}/3
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <LinkButton href="/industry/interests" variant="secondary">
            Edit interests
          </LinkButton>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <SectionTitle
              eyebrow="Project discovery"
              title="Projects looking for industry support"
              description="Projects where your expertise, technology, mentorship, or funding could help."
            />
            <ProjectFilters
              current={{
                domain,
                support,
                stage,
                q,
              }}
            />
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(projects ?? []).map((p) => (
                <ProjectCard key={p.id} project={p as unknown as ProjectRow} />
              ))}
            </div>
            {(!projects || projects.length === 0) && (
              <div className="mt-6">
                <EmptyState
                  title="No projects match those filters."
                  description="Broaden your filters or update your interests to see more matches."
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card tone="sage" className="p-6">
            <div className="h-0.5 w-8 bg-[color:var(--accent-2)] mb-4" />
            <p className="eyebrow mb-3">My interests</p>
            {!profile || profile.scope_domains.length === 0 ? (
              <>
                <p className="text-sm text-muted">
                  Tell us what your organization cares about to improve future
                  recommendations.
                </p>
                <LinkButton
                  href="/industry/interests"
                  variant="secondary"
                  className="mt-4"
                >
                  Set interests
                </LinkButton>
              </>
            ) : (
              <div className="space-y-4 text-sm">
                <TagRow label="Domains" items={profile.scope_domains} />
                <TagRow label="Expertise" items={profile.expertise} />
                <TagRow
                  label="Support"
                  items={profile.support_capabilities.map(
                    (s) =>
                      SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s,
                  )}
                />
                <Link
                  href="/industry/interests"
                  className="mt-2 inline-block text-xs underline underline-offset-4"
                >
                  Edit interests
                </Link>
              </div>
            )}
          </Card>

          <Card tone="warm" className="p-6">
            <p className="eyebrow mb-3">My collaborations</p>
            {(offers ?? []).length === 0 ? (
              <EmptyState title="No collaborations yet." />
            ) : (
              <ul className="divide-y divide-border">
                {(offers ?? []).map((o) => {
                  const proj = (o as unknown as { projects?: { title: string } })
                    .projects;
                  return (
                    <li key={o.id} className="py-3 text-sm">
                      <Link
                        href={`/projects/${o.project_id}`}
                        className="font-medium hover:underline underline-offset-4"
                      >
                        {proj?.title ?? "Project"}
                      </Link>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted">
                        <span>
                          {
                            SUPPORT_TYPE_LABEL[
                              o.support_type as SupportOfferType
                            ]
                          }
                        </span>
                        <span className="uppercase tracking-wider">
                          {
                            COLLABORATION_STATUS_LABEL[
                              o.status as CollaborationStatus
                            ]
                          }
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Container>
  );
}

function TagRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-2">Not set</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {items.map((s) => (
            <li
              key={s}
              className="border border-border bg-background px-2 py-0.5 text-xs"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ProjectRow = Project & {
  institutions?: {
    name: string;
    slug: string;
    city: string | null;
    district: string | null;
  } | null;
};

function ProjectCard({ project }: { project: ProjectRow }) {
  const inst = project.institutions ?? null;
  const location =
    [project.city, project.district ?? project.state]
      .filter(Boolean)
      .join(", ") ||
    (inst ? [inst.city, inst.district].filter(Boolean).join(", ") : "");

  return (
    <Card className="p-5 flex flex-col">
      <p className="text-xs uppercase tracking-widest text-muted">
        {project.domain ?? "General"}
      </p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight">
        {project.title}
      </h3>
      {inst && (
        <p className="mt-1 text-sm text-muted">
          {inst.name}
          {location ? ` · ${location}` : ""}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span>
          <span className="uppercase tracking-wider mr-1">Stage</span>
          {PROJECT_STAGE_LABEL[project.stage]}
        </span>
        <span className="tabular-nums">Progress {project.progress}%</span>
      </div>

      {project.seeking_support.length > 0 && (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-widest text-muted">
            Seeking
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {project.seeking_support.map((s) => (
              <li
                key={s}
                className="border border-border bg-background px-2 py-0.5 text-xs"
              >
                {SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-5">
        <LinkButton
          href={`/projects/${project.id}`}
          variant="secondary"
          className="w-full"
        >
          View project
        </LinkButton>
      </div>
    </Card>
  );
}

function ProjectFilters({
  current,
}: {
  current: {
    domain: string | null;
    support: string | null;
    stage: ProjectStage | null;
    q: string | null;
  };
}) {
  return (
    <form
      method="get"
      className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3"
    >
      <input
        name="q"
        defaultValue={current.q ?? ""}
        placeholder="Search projects…"
        className="md:col-span-2 h-10 px-3 border border-border bg-background text-foreground text-sm focus:border-[color:var(--accent)] focus:outline-none"
      />
      <select
        name="domain"
        defaultValue={current.domain ?? ""}
        className="h-10 px-2 border border-border bg-background text-foreground text-sm"
      >
        <option value="">All domains</option>
        {[
          "water",
          "agriculture",
          "healthcare",
          "education",
          "energy",
          "environment",
          "accessibility",
          "urban infrastructure",
        ].map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        name="stage"
        defaultValue={current.stage ?? ""}
        className="h-10 px-2 border border-border bg-background text-foreground text-sm"
      >
        <option value="">All stages</option>
        {Object.entries(PROJECT_STAGE_LABEL).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <select
        name="support"
        defaultValue={current.support ?? ""}
        className="h-10 px-2 border border-border bg-background text-foreground text-sm"
      >
        <option value="">Any support</option>
        {Object.entries(SUPPORT_TYPE_LABEL).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="md:col-span-1 h-10 px-4 border border-border-strong bg-background text-sm hover:bg-surface"
      >
        Filter
      </button>
    </form>
  );
}
