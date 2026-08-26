import Link from "next/link";
import {
  Card,
  Container,
  EmptyState,
  LinkButton,
  StatusPill,
} from "@/components/ui";
import { computeCapability } from "@/lib/capability";
import { requireInstitutionMembership } from "@/lib/institution";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INSTITUTION_TYPE_LABEL } from "@/lib/supabase/types";

export const metadata = { title: "Institution — Raah" };

export default async function InstitutionDashboardPage() {
  const { institution } = await requireInstitutionMembership();
  const supabase = await createSupabaseServerClient();

  const [depts, areas, caps, facs, faculty, fverif] = await Promise.all([
    supabase.from("departments").select("id").eq("institution_id", institution.id),
    supabase.from("institution_research_areas").select("id").eq("institution_id", institution.id),
    supabase.from("institution_capabilities").select("id").eq("institution_id", institution.id),
    supabase.from("institution_facilities").select("id").eq("institution_id", institution.id),
    supabase.from("faculty").select("id").eq("institution_id", institution.id),
    supabase
      .from("faculty_verifications")
      .select("status, faculty!inner(institution_id)")
      .eq("faculty.institution_id", institution.id)
      .eq("status", "verified"),
  ]);

  const facultyTotal = faculty.data?.length ?? 0;
  const facultyVerified = fverif.data?.length ?? 0;

  const capability = computeCapability({
    institution,
    researchAreas: areas.data?.length ?? 0,
    facultyVerified,
    facultyTotal,
    facilities: facs.data?.length ?? 0,
    capabilities: caps.data?.length ?? 0,
  });

  return (
    <Container className="py-14">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">
            {INSTITUTION_TYPE_LABEL[institution.type]}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {institution.name}
          </h1>
          <div className="mt-3 flex items-center gap-3">
            <StatusPill status={institution.verification_status} />
            {institution.city && (
              <span className="text-sm text-muted">
                {institution.city}
                {institution.district ? `, ${institution.district}` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <LinkButton href="/institution/profile" variant="secondary">
            Edit profile
          </LinkButton>
          <LinkButton href="/institution/verification">
            Verification
          </LinkButton>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card tone="blush" className="lg:col-span-2 p-6">
          <div className="h-0.5 w-10 bg-[color:var(--accent)] mb-4" />
          <p className="eyebrow mb-3">Institution capability</p>
          <div className="flex items-baseline gap-3">
            <p className="text-5xl font-semibold tracking-tight tabular-nums">
              {capability.total}
            </p>
            <p className="text-muted text-sm">/ 100</p>
          </div>
          <p className="mt-2 text-sm text-muted max-w-lg">
            A transparent score based on measurable platform information. It
            improves as verification, capabilities and faculty affiliation
            complete.
          </p>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {[
              ["Verification", capability.verification],
              ["Research expertise", capability.research],
              ["Faculty expertise", capability.faculty],
              ["Infrastructure", capability.infrastructure],
              ["Projects", capability.projects],
              ["Industry ecosystem", capability.industry],
              ["Profile completeness", capability.profile],
            ].map(([label, v]) => {
              const seg = v as { score: number; max: number };
              return (
                <div
                  key={label as string}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span>{label as string}</span>
                  <span className="tabular-nums text-muted">
                    {seg.score} / {seg.max}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card tone="sage" className="p-6">
            <div className="h-0.5 w-8 bg-[color:var(--accent-2)] mb-4" />
            <p className="eyebrow mb-3">At a glance</p>
            <dl className="grid grid-cols-2 gap-y-4 text-sm">
              <dt className="text-muted">Departments</dt>
              <dd className="text-right tabular-nums">{depts.data?.length ?? 0}</dd>
              <dt className="text-muted">Research areas</dt>
              <dd className="text-right tabular-nums">{areas.data?.length ?? 0}</dd>
              <dt className="text-muted">Faculty</dt>
              <dd className="text-right tabular-nums">{facultyTotal}</dd>
              <dt className="text-muted">Verified faculty</dt>
              <dd className="text-right tabular-nums">{facultyVerified}</dd>
              <dt className="text-muted">Facilities</dt>
              <dd className="text-right tabular-nums">{facs.data?.length ?? 0}</dd>
            </dl>
          </Card>

          <Card tone="warm" className="p-6">
            <p className="eyebrow mb-3">Matched challenges</p>
            <EmptyState
              title="No challenges assigned yet."
              description="Challenge matching goes live as more challenges are validated."
            />
            <Link
              href="/challenges"
              className="mt-3 inline-block text-sm underline underline-offset-4"
            >
              Browse challenges
            </Link>
          </Card>

          <Card tone="warm" className="p-6">
            <p className="eyebrow mb-3">Active projects</p>
            <EmptyState title="No active projects yet." />
          </Card>
        </div>
      </div>
    </Container>
  );
}
