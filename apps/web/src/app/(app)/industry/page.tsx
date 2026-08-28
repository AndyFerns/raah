import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  KpiCard,
  LinkButton,
  ProgressBar,
  SectionTitle,
  StatusPill,
} from "@/components/ui";
import {
  ArrowRightIcon,
  BuildingIcon,
  FolderIcon,
  HandshakeIcon,
  MapPinIcon,
  SearchIcon,
  SparkleIcon,
} from "@/components/icons";
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

export const metadata = { title: "Overview — Industry" };

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
    .select("id, project_id, support_type, status, updated_at, projects(title)")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  const profileFieldsSet = profile
    ? [
        profile.scope_domains.length > 0,
        profile.expertise.length > 0,
        profile.support_capabilities.length > 0,
      ].filter(Boolean).length
    : 0;

  const acceptedOffers = (offers ?? []).filter(
    (o) => o.status === "accepted",
  ).length;
  const pendingOffers = (offers ?? []).filter(
    (o) => o.status === "pending",
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <p className="eyebrow mb-2">
            {INDUSTRY_ORG_TYPE_LABEL[organization.type]}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {organization.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusPill status={organization.verification_status} />
            {organization.city && (
              <Chip>
                <MapPinIcon size={12} />
                {organization.city}
                {organization.district ? `, ${organization.district}` : ""}
              </Chip>
            )}
            <Chip>
              Profile {profileFieldsSet}/3
            </Chip>
          </div>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/industry/interests" variant="secondary">
            Edit interests
          </LinkButton>
          <LinkButton href="/projects" variant="dark">
            Browse projects
            <ArrowRightIcon size={14} />
          </LinkButton>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          eyebrow="Discoverable"
          value={projects?.length ?? 0}
          hint="Matching your filters"
          icon={<FolderIcon size={14} />}
        />
        <KpiCard
          eyebrow="Active offers"
          value={pendingOffers}
          trend={pendingOffers > 0 ? "Pending" : "None"}
          trendTone={pendingOffers > 0 ? "warning" : "neutral"}
          icon={<HandshakeIcon size={14} />}
        />
        <KpiCard
          eyebrow="Accepted"
          value={acceptedOffers}
          trend={acceptedOffers > 0 ? "Active" : "—"}
          trendTone={acceptedOffers > 0 ? "success" : "neutral"}
          icon={<SparkleIcon size={14} />}
        />
        <KpiCard
          eyebrow="Interests set"
          value={`${profileFieldsSet}/3`}
          hint={profileFieldsSet === 3 ? "Complete" : "Improve matches"}
          icon={<BuildingIcon size={14} />}
        />
      </div>

      {/* Two-column: projects + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionTitle
            eyebrow="Discovery"
            title="Projects looking for industry support"
            description="Where your expertise, tech, mentorship, or funding could help."
          />

          <ProjectFilters
            current={{
              domain,
              support,
              stage,
              q,
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(projects ?? []).map((p) => (
              <ProjectCard key={p.id} project={p as unknown as ProjectRow} />
            ))}
          </div>
          {(!projects || projects.length === 0) && (
            <EmptyState
              title="No projects match those filters."
              description="Broaden your filters or update your interests to see more matches."
              action={
                <LinkButton href="/industry/interests" variant="secondary">
                  Update interests
                </LinkButton>
              }
            />
          )}
        </div>

        <div className="space-y-6">
          <InterestsSummary
            profile={profile}
            fieldsSet={profileFieldsSet}
          />

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">My collaborations</p>
              {(offers ?? []).length > 0 && (
                <Badge tone="neutral">{offers?.length}</Badge>
              )}
            </div>
            {(offers ?? []).length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No collaborations yet."
                  description="Open a project to send your first offer."
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[color:var(--border)]">
                {(offers ?? []).map((o) => {
                  const proj = (
                    o as unknown as { projects?: { title: string } }
                  ).projects;
                  return (
                    <li key={o.id} className="py-3">
                      <Link
                        href={`/projects/${o.project_id}`}
                        className="block hover:opacity-80 transition-opacity"
                      >
                        <p className="text-sm font-medium truncate">
                          {proj?.title ?? "Project"}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <Chip>
                            {
                              SUPPORT_TYPE_LABEL[
                                o.support_type as SupportOfferType
                              ]
                            }
                          </Chip>
                          <StatusPill status={o.status} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
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
    [project.city, project.district ?? project.state].filter(Boolean).join(", ") ||
    (inst ? [inst.city, inst.district].filter(Boolean).join(", ") : "");

  return (
    <Card interactive className="p-5 flex flex-col group">
      <div className="flex items-start justify-between gap-3">
        <Chip tone="neutral">{project.domain ?? "General"}</Chip>
        <Badge tone="accent">{PROJECT_STAGE_LABEL[project.stage]}</Badge>
      </div>
      <h3 className="mt-3 text-base font-semibold tracking-tight leading-snug">
        {project.title}
      </h3>
      {inst && (
        <p className="mt-1 text-xs text-muted flex items-center gap-1.5">
          <BuildingIcon size={12} />
          {inst.name}
          {location ? ` · ${location}` : ""}
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted uppercase tracking-widest mb-1.5">
          <span>Progress</span>
          <span className="tabular-nums">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} tone="accent2" />
      </div>

      {project.seeking_support.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.seeking_support.slice(0, 3).map((s) => (
            <Chip key={s}>
              {SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s}
            </Chip>
          ))}
          {project.seeking_support.length > 3 && (
            <Chip>+{project.seeking_support.length - 3}</Chip>
          )}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-[color:var(--border)] flex items-center justify-between">
        <span className="text-xs text-muted">View project</span>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[color:var(--foreground)] text-[color:var(--background)] group-hover:translate-x-0.5 transition-transform"
          aria-label={`Open ${project.title}`}
        >
          <ArrowRightIcon size={14} />
        </Link>
      </div>
    </Card>
  );
}

function InterestsSummary({
  profile,
  fieldsSet,
}: {
  profile: {
    scope_domains: string[];
    expertise: string[];
    support_capabilities: string[];
  } | null;
  fieldsSet: number;
}) {
  if (!profile || fieldsSet === 0) {
    return (
      <Card tone="sage" className="p-5">
        <p className="eyebrow">My interests</p>
        <p className="mt-3 text-sm text-foreground">
          Tell us what you care about to improve future recommendations.
        </p>
        <LinkButton
          href="/industry/interests"
          variant="secondary"
          size="sm"
          className="mt-4"
        >
          Set interests
          <ArrowRightIcon size={12} />
        </LinkButton>
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">My interests</p>
        <Link
          href="/industry/interests"
          className="text-xs text-muted hover:text-foreground underline underline-offset-4"
        >
          Edit
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        <TagRow label="Domains" items={profile.scope_domains} />
        <TagRow label="Expertise" items={profile.expertise} />
        <TagRow
          label="Support"
          items={profile.support_capabilities.map(
            (s) => SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s,
          )}
        />
      </div>
    </Card>
  );
}

function TagRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-2 mb-1.5">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-2">Not set</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      )}
    </div>
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
      className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-[color:var(--surface)] p-2 rounded-2xl border border-[color:var(--border)] shadow-[var(--shadow-xs)]"
    >
      <label className="md:col-span-2 relative flex items-center">
        <SearchIcon
          size={16}
          className="absolute left-3 text-muted-2 pointer-events-none"
        />
        <input
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="Search projects…"
          className="w-full h-10 pl-9 pr-3 rounded-xl bg-[color:var(--surface-2)] border border-transparent text-foreground text-sm focus:border-[color:var(--accent)] focus:outline-none placeholder:text-[color:var(--muted-2)]"
        />
      </label>
      <select
        name="domain"
        defaultValue={current.domain ?? ""}
        className="h-10 px-3 rounded-xl bg-[color:var(--surface-2)] border border-transparent text-foreground text-sm focus:border-[color:var(--accent)] focus:outline-none"
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
        className="h-10 px-3 rounded-xl bg-[color:var(--surface-2)] border border-transparent text-foreground text-sm focus:border-[color:var(--accent)] focus:outline-none"
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
        className="h-10 px-3 rounded-xl bg-[color:var(--surface-2)] border border-transparent text-foreground text-sm focus:border-[color:var(--accent)] focus:outline-none"
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
        className="md:col-span-5 lg:col-span-1 h-10 px-4 rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Apply filters
      </button>
    </form>
  );
}
