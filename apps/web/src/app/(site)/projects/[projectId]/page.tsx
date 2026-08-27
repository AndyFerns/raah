import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  Container,
  EmptyState,
  LinkButton,
  SectionTitle,
} from "@/components/ui";
import { getIndustryContext } from "@/lib/industry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROJECT_STAGE_LABEL,
  SUPPORT_TYPE_LABEL,
  type Project,
  type ProjectMilestone,
  type SupportOfferType,
} from "@/lib/supabase/types";
import { OfferPanel } from "./offer-panel";

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

  const { data: milestones } = await supabase
    .from("project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("ord", { ascending: true });

  const industry = await getIndustryContext();

  // Only load offers if this user's org has any on this project.
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
    <Container className="py-14">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <p className="eyebrow mb-3">{p.domain ?? "Project"}</p>
            <h1 className="text-4xl font-semibold tracking-tight">{p.title}</h1>
            {inst && (
              <p className="mt-3 text-muted">
                {inst.name}
                {inst.city ? ` · ${inst.city}` : ""}
                {inst.district ? `, ${inst.district}` : ""}
              </p>
            )}
            <div className="mt-4 flex items-center gap-4 text-sm text-muted">
              <span>
                <span className="uppercase tracking-wider mr-1">Stage</span>
                {PROJECT_STAGE_LABEL[p.stage]}
              </span>
              <span className="tabular-nums">Progress {p.progress}%</span>
            </div>
          </div>

          {p.problem_statement && (
            <Card className="p-6">
              <p className="eyebrow mb-3">Problem statement</p>
              <p className="text-sm leading-relaxed">{p.problem_statement}</p>
            </Card>
          )}

          <Card tone="warm" className="p-6">
            <SectionTitle eyebrow="Project status" title="Lifecycle" />
            <ol className="mt-5 space-y-2">
              {(milestones ?? []).length === 0 && (
                <li className="text-sm text-muted">
                  No milestones recorded yet.
                </li>
              )}
              {(milestones ?? []).map((m) => {
                const mile = m as ProjectMilestone;
                return (
                  <li
                    key={mile.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-2.5 w-2.5 rounded-full border ${
                        mile.completed
                          ? "bg-[color:var(--accent-2)] border-[color:var(--accent-2)]"
                          : "bg-transparent border-border-strong"
                      }`}
                    />
                    <span
                      className={
                        mile.completed ? "" : "text-muted"
                      }
                    >
                      {mile.label}
                    </span>
                  </li>
                );
              })}
            </ol>
            {(p.latest_update || p.next_milestone) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {p.latest_update && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted">
                      Latest update
                    </p>
                    <p className="mt-1">{p.latest_update}</p>
                  </div>
                )}
                {p.next_milestone && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted">
                      Next milestone
                    </p>
                    <p className="mt-1">{p.next_milestone}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <p className="eyebrow mb-3">Mentorship</p>
            {p.mentorship_details ? (
              <p className="text-sm leading-relaxed">{p.mentorship_details}</p>
            ) : (
              <p className="text-sm text-muted">Not specified.</p>
            )}
            <dl className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-y-3 text-sm">
              {p.mentorship_mode && (
                <>
                  <dt className="text-muted">Preferred mode</dt>
                  <dd>{p.mentorship_mode}</dd>
                </>
              )}
              {p.mentorship_availability && (
                <>
                  <dt className="text-muted">Availability</dt>
                  <dd>{p.mentorship_availability}</dd>
                </>
              )}
              {p.required_expertise.length > 0 && (
                <>
                  <dt className="text-muted">Required expertise</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-1.5">
                      {p.required_expertise.map((e) => (
                        <li
                          key={e}
                          className="border border-border bg-background px-2 py-0.5 text-xs"
                        >
                          {e}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
            </dl>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card tone="sage" className="p-6">
            <p className="eyebrow mb-3">Seeking</p>
            {p.seeking_support.length === 0 ? (
              <p className="text-sm text-muted">Not specified.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {p.seeking_support.map((s) => (
                  <li
                    key={s}
                    className="border border-border bg-background px-2 py-0.5 text-xs"
                  >
                    {SUPPORT_TYPE_LABEL[s as SupportOfferType] ?? s}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <p className="eyebrow mb-3">Project contact</p>
            <dl className="text-sm space-y-3">
              {p.faculty_mentor_name && (
                <div>
                  <p className="font-medium">{p.faculty_mentor_name}</p>
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Faculty mentor
                  </p>
                </div>
              )}
              {p.faculty_mentor_department && (
                <div>
                  <dt className="text-muted text-xs uppercase tracking-widest">
                    Department
                  </dt>
                  <dd>{p.faculty_mentor_department}</dd>
                </div>
              )}
              {p.faculty_mentor_expertise && (
                <div>
                  <dt className="text-muted text-xs uppercase tracking-widest">
                    Expertise
                  </dt>
                  <dd>{p.faculty_mentor_expertise}</dd>
                </div>
              )}
              {inst && (
                <div>
                  <dt className="text-muted text-xs uppercase tracking-widest">
                    Institution
                  </dt>
                  <dd>
                    <Link
                      href={`/institutions/${inst.slug}`}
                      className="underline underline-offset-4"
                    >
                      {inst.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted text-xs uppercase tracking-widest">
                  Location
                </dt>
                <dd>{location}</dd>
              </div>
              {p.contact_email && industry && (
                <div>
                  <dt className="text-muted text-xs uppercase tracking-widest">
                    Email
                  </dt>
                  <dd>
                    <a
                      href={`mailto:${p.contact_email}`}
                      className="underline underline-offset-4"
                    >
                      {p.contact_email}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {industry ? (
            <OfferPanel
              projectId={p.id}
              organizationName={industry.organization.name}
              existingOffers={myOffers}
            />
          ) : (
            <Card tone="blush" className="p-6">
              <p className="eyebrow mb-2">Want to collaborate?</p>
              <p className="text-sm text-muted">
                Register your organization to offer support, mentorship, or
                funding.
              </p>
              <LinkButton
                href="/industry/onboarding"
                variant="secondary"
                className="mt-4"
              >
                Register organization
              </LinkButton>
            </Card>
          )}
        </aside>
      </div>
    </Container>
  );
}

export const dynamic = "force-dynamic";

export function EmptyMilestones() {
  return <EmptyState title="No milestones yet." />;
}
