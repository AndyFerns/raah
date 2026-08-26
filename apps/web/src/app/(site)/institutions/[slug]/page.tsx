import { notFound } from "next/navigation";
import {
  Card,
  Container,
  StatusPill,
} from "@/components/ui";
import { computeCapability } from "@/lib/capability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  INSTITUTION_TYPE_LABEL,
  type Institution,
} from "@/lib/supabase/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `${slug} — Raah` };
}

export default async function PublicInstitutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: inst } = await supabase
    .from("institutions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!inst) notFound();

  const institution = inst as Institution;

  const [depts, areas, caps, facs, faculty, verifiedFaculty] = await Promise.all([
    supabase.from("departments").select("name").eq("institution_id", institution.id).order("name"),
    supabase.from("institution_research_areas").select("area").eq("institution_id", institution.id).order("area"),
    supabase.from("institution_capabilities").select("capability").eq("institution_id", institution.id).order("capability"),
    supabase.from("institution_facilities").select("name, description").eq("institution_id", institution.id).order("name"),
    supabase.from("faculty").select("id").eq("institution_id", institution.id),
    supabase
      .from("faculty_verifications")
      .select("faculty!inner(institution_id, full_name, designation, department)")
      .eq("faculty.institution_id", institution.id)
      .eq("status", "verified"),
  ]);

  const facultyTotal = faculty.data?.length ?? 0;
  const facultyVerifiedList = (verifiedFaculty.data ?? []).map(
    (v) => v.faculty as unknown as {
      full_name: string;
      designation: string | null;
      department: string | null;
    }
  );
  const facultyVerified = facultyVerifiedList.length;

  const capability = computeCapability({
    institution,
    researchAreas: areas.data?.length ?? 0,
    facultyVerified,
    facultyTotal,
    facilities: facs.data?.length ?? 0,
    capabilities: caps.data?.length ?? 0,
  });

  return (
    <>
    <section className="border-b border-border bg-[color:var(--surface-2)]">
      <Container className="py-10 max-w-5xl">
        <div className="h-0.5 w-10 bg-[color:var(--accent-2)] mb-6" />
        <p className="text-xs uppercase tracking-widest text-muted">
          {INSTITUTION_TYPE_LABEL[institution.type]}
        </p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
          {institution.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {institution.verification_status === "verified" && (
            <StatusPill status="verified" />
          )}
          <span className="text-sm text-muted">
            {[institution.city, institution.district, institution.state]
              .filter(Boolean)
              .join(", ")}
          </span>
          {institution.website && (
            <a
              href={institution.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[color:var(--accent)] underline underline-offset-4"
            >
              Official website
            </a>
          )}
        </div>
      </Container>
    </section>
    <Container className="py-14 max-w-5xl">
      {institution.description && (
        <div className="max-w-3xl">
          <p className="eyebrow mb-3">About</p>
          <p className="text-base leading-relaxed text-foreground">
            {institution.description}
          </p>
        </div>
      )}

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2 space-y-8">
          <ListBlock
            title="Departments"
            items={(depts.data ?? []).map((d) => d.name)}
          />
          <ListBlock
            title="Research areas"
            items={(areas.data ?? []).map((a) => a.area)}
          />
          <ListBlock
            title="Capabilities"
            items={(caps.data ?? []).map((c) => c.capability)}
          />
          <div>
            <p className="eyebrow mb-3">Facilities</p>
            {(facs.data ?? []).length === 0 ? (
              <p className="text-sm text-muted">Not listed.</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {(facs.data ?? []).map((f) => (
                  <li key={f.name} className="py-3">
                    <p className="text-sm">{f.name}</p>
                    {f.description && (
                      <p className="text-xs text-muted">{f.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="eyebrow mb-3">Faculty</p>
            {facultyVerifiedList.length === 0 ? (
              <p className="text-sm text-muted">
                No verified faculty listed publicly yet.
              </p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {facultyVerifiedList.map((f, i) => (
                  <li key={`${f.full_name}-${i}`} className="py-3">
                    <p className="text-sm font-medium">{f.full_name}</p>
                    <p className="text-xs text-muted">
                      {[f.designation, f.department].filter(Boolean).join(" · ") ||
                        "Faculty member"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card tone="blush" className="p-6 h-fit">
          <div className="h-0.5 w-8 bg-[color:var(--accent)] mb-4" />
          <p className="eyebrow mb-3">Institution capability</p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-semibold tabular-nums">
              {capability.total}
            </p>
            <p className="text-sm text-muted">/ 100</p>
          </div>
          <p className="mt-2 text-xs text-muted">
            Computed from verification, expertise, faculty and profile signals.
          </p>
        </Card>
      </div>
    </Container>
    </>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Not listed.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="text-xs border border-border bg-background px-2 py-1"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
