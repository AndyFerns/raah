import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  Chip,
  Container,
  LinkButton,
  ProgressBar,
  StatusPill,
} from "@/components/ui";
import {
  ArrowRightIcon,
  BuildingIcon,
  CheckIcon,
  ExternalIcon,
  GraduationIcon,
  MapPinIcon,
  SparkleIcon,
} from "@/components/icons";
import { getIndustryContext } from "@/lib/industry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROJECT_STAGE_LABEL,
  SUPPORT_TYPE_LABEL,
  type Project,
  type ProjectMedia,
  type ProjectMilestone,
  type SupportOfferType,
} from "@/lib/supabase/types";
import { MediaGallery, type MediaItem } from "./media-gallery";
import { OfferPanel } from "./offer-panel";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function resolveMediaUrl(m: ProjectMedia): string | null {
  if (m.external_url) return m.external_url;
  if (m.storage_path && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/project-media/${m.storage_path}`;
  }
  return null;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, problem_statement, domain, institution_id, state, district, city, stage, progress, seeking_support, required_expertise, collaboration_types, faculty_mentor_name, faculty_mentor_department, faculty_mentor_expertise, faculty_mentor_email, contact_email, mentorship_details, mentorship_mode, mentorship_availability, latest_update, next_milestone, discoverable, status, created_at, updated_at, institutions(name, slug, city, district, verification_status)",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (!project) notFound();

  const p = project as unknown as Project & {
    institutions?: {
      name: string;
      slug: string;
      city: string | null;
      district: string | null;
      verification_status: string;
    } | null;
  };

  const [{ data: milestones }, { data: media }, industry] = await Promise.all([
    supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("ord", { ascending: true }),
    supabase
      .from("project_media")
      .select("id, external_url, storage_path, caption, ord")
      .eq("project_id", projectId)
      .order("ord", { ascending: true }),
    getIndustryContext(),
  ]);

  const mediaItems: MediaItem[] = ((media ?? []) as ProjectMedia[])
    .map((m) => {
      const url = resolveMediaUrl(m);
      if (!url) return null;
      return { id: m.id, url, caption: m.caption };
    })
    .filter((x): x is MediaItem => x !== null);

  let myOffers: { id: string; support_type: string; status: string }[] = [];
  if (industry) {
    const { data } = await supabase
      .from("project_support_offers")
      .select("id, support_type, status")
      .eq("project_id", projectId)
      .eq("organization_id", industry.organization.id)
      .order("created_at", { ascending: false });
    myOffers = data ?? [];
  }

  const inst = p.institutions ?? null;
  const location =
    [p.city, p.district, p.state].filter(Boolean).join(", ") || "—";

  return (
    <Container className="py-10 md:py-14">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-xs text-muted mb-6">
        <Link
          href={industry ? "/industry" : "/projects"}
          className="hover:text-foreground"
        >
          {industry ? "Industry" : "Projects"}
        </Link>
        <span className="text-muted-2">/</span>
        <span className="text-foreground truncate max-w-xs">{p.title}</span>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Chip>{p.domain ?? "General"}</Chip>
              <Badge tone="accent">{PROJECT_STAGE_LABEL[p.stage]}</Badge>
              {inst?.verification_status === "verified" && (
                <Badge tone="success">Verified institution</Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              {p.title}
            </h1>
            {inst && (
              <p className="mt-3 text-sm text-muted flex items-center gap-2 flex-wrap">
                <BuildingIcon size={14} />
                <Link
                  href={`/institutions/${inst.slug}`}
                  className="hover:text-foreground underline underline-offset-4"
                >
                  {inst.name}
                </Link>
                <span className="text-muted-2">·</span>
                <MapPinIcon size={14} />
                {location}
              </p>
            )}
          </div>

          {/* Media gallery */}
          <MediaGallery items={mediaItems} />

          {/* Progress card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="eyebrow mb-1">Overall progress</p>
                <p className="text-3xl font-semibold tabular-nums">
                  {p.progress}%
                </p>
              </div>
              <Badge tone="accent">
                {PROJECT_STAGE_LABEL[p.stage]}
              </Badge>
            </div>
            <ProgressBar value={p.progress} tone="accent2" />
            {(p.latest_update || p.next_milestone) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {p.latest_update && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-2 mb-1">
                      Latest update
                    </p>
                    <p className="text-foreground">{p.latest_update}</p>
                  </div>
                )}
                {p.next_milestone && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-2 mb-1">
                      Next milestone
                    </p>
                    <p className="text-foreground">{p.next_milestone}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {p.problem_statement && (
            <Card className="p-6">
              <p className="eyebrow mb-3">Problem statement</p>
              <p className="text-sm text-foreground leading-relaxed">
                {p.problem_statement}
              </p>
            </Card>
          )}

          {/* Timeline */}
          <Card tone="warm" className="p-6">
            <p className="eyebrow mb-4">Lifecycle</p>
            {(milestones ?? []).length === 0 ? (
              <p className="text-sm text-muted">
                No milestones recorded yet.
              </p>
            ) : (
              <ol className="relative space-y-4">
                {(milestones ?? []).map((m, i) => {
                  const mile = m as ProjectMilestone;
                  const isLast = i === (milestones?.length ?? 0) - 1;
                  return (
                    <li key={mile.id} className="flex items-start gap-4 relative">
                      {!isLast && (
                        <span
                          className="absolute left-3.5 top-8 bottom-[-16px] w-px bg-[color:var(--border)]"
                          aria-hidden
                        />
                      )}
                      <span
                        className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 relative z-10 ${
                          mile.completed
                            ? "bg-[color:var(--accent-2)] border-[color:var(--accent-2)] text-white"
                            : "bg-[color:var(--surface)] border-[color:var(--border-strong)] text-muted-2"
                        }`}
                      >
                        {mile.completed ? (
                          <CheckIcon size={14} />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--muted-2)]" />
                        )}
                      </span>
                      <div className="pt-0.5">
                        <p
                          className={`text-sm font-medium ${mile.completed ? "text-foreground" : "text-muted"}`}
                        >
                          {mile.label}
                        </p>
                        {mile.completed && mile.completed_at && (
                          <p className="mt-0.5 text-[11px] text-muted-2">
                            {new Date(mile.completed_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>

          {/* Mentorship */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                <GraduationIcon size={16} />
              </div>
              <p className="eyebrow">Mentorship</p>
            </div>
            {p.mentorship_details ? (
              <p className="text-sm text-foreground leading-relaxed">
                {p.mentorship_details}
              </p>
            ) : (
              <p className="text-sm text-muted">Not specified.</p>
            )}
            <dl className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              {p.mentorship_mode && (
                <>
                  <dt className="text-muted-2 text-[10px] uppercase tracking-widest">
                    Preferred mode
                  </dt>
                  <dd className="md:col-span-1 -mt-3 md:mt-0">
                    {p.mentorship_mode}
                  </dd>
                </>
              )}
              {p.mentorship_availability && (
                <>
                  <dt className="text-muted-2 text-[10px] uppercase tracking-widest">
                    Availability
                  </dt>
                  <dd className="md:col-span-1 -mt-3 md:mt-0">
                    {p.mentorship_availability}
                  </dd>
                </>
              )}
            </dl>
            {p.required_expertise.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] uppercase tracking-widest text-muted-2 mb-2">
                  Required expertise
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {p.required_expertise.map((e) => (
                    <Chip key={e}>{e}</Chip>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <Card tone="sage" className="p-5">
            <p className="eyebrow">Seeking</p>
            {p.seeking_support.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Not specified.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.seeking_support.map((s) => (
                  <Chip key={s} tone="accent">
                    {SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s}
                  </Chip>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="eyebrow mb-3">Project contact</p>
            <dl className="text-sm space-y-3">
              {p.faculty_mentor_name && (
                <div>
                  <p className="font-medium">{p.faculty_mentor_name}</p>
                  <p className="text-xs text-muted">Faculty mentor</p>
                </div>
              )}
              {p.faculty_mentor_department && (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-2">
                    Department
                  </dt>
                  <dd>{p.faculty_mentor_department}</dd>
                </div>
              )}
              {p.faculty_mentor_expertise && (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-2">
                    Expertise
                  </dt>
                  <dd>{p.faculty_mentor_expertise}</dd>
                </div>
              )}
              {inst && (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-2">
                    Institution
                  </dt>
                  <dd>
                    <Link
                      href={`/institutions/${inst.slug}`}
                      className="inline-flex items-center gap-1 hover:text-foreground underline underline-offset-4"
                    >
                      {inst.name}
                      <ExternalIcon size={12} />
                    </Link>
                  </dd>
                </div>
              )}
              {p.contact_email && industry && (
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-2">
                    Email
                  </dt>
                  <dd>
                    <a
                      href={`mailto:${p.contact_email}`}
                      className="hover:text-foreground underline underline-offset-4"
                    >
                      {p.contact_email}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {inst && (
              <div className="mt-5 pt-4 border-t border-[color:var(--border)]">
                <StatusPill status={inst.verification_status} />
              </div>
            )}
          </Card>

          {industry ? (
            <OfferPanel
              projectId={p.id}
              organizationName={industry.organization.name}
              existingOffers={myOffers}
            />
          ) : (
            <Card tone="blush" className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-white">
                  <SparkleIcon size={14} />
                </div>
                <p className="eyebrow">Collaborate</p>
              </div>
              <p className="text-sm text-foreground">
                Register your organization to offer support, mentorship, or
                funding.
              </p>
              <LinkButton
                href="/industry/onboarding"
                variant="dark"
                size="sm"
                className="mt-4"
              >
                Register organization
                <ArrowRightIcon size={12} />
              </LinkButton>
            </Card>
          )}
        </aside>
      </div>
    </Container>
  );
}

export const dynamic = "force-dynamic";
