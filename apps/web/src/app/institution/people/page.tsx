import { Card, Container, StatusPill } from "@/components/ui";
import { requireInstitutionMembership } from "@/lib/institution";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/supabase/env";
import { AddFacultyForm } from "./add-form";
import { FacultyRow } from "./faculty-row";

export const metadata = { title: "People — Raah" };

export default async function InstitutionPeoplePage() {
  const { institution } = await requireInstitutionMembership();
  const supabase = await createSupabaseServerClient();

  const { data: faculty } = await supabase
    .from("faculty")
    .select("id, full_name, designation, department, official_email")
    .eq("institution_id", institution.id)
    .order("created_at", { ascending: false });

  const facultyIds = (faculty ?? []).map((f) => f.id);
  const { data: verifs } = facultyIds.length
    ? await supabase
        .from("faculty_verifications")
        .select("id, faculty_id, status, token, sent_at, verified_at")
        .in("faculty_id", facultyIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const latestByFaculty = new Map<
    string,
    { id: string; status: string; token: string | null; sent_at: string | null; verified_at: string | null }
  >();
  for (const v of verifs ?? []) {
    if (!latestByFaculty.has(v.faculty_id)) latestByFaculty.set(v.faculty_id, v);
  }

  return (
    <Container className="py-14 max-w-4xl">
      <p className="eyebrow mb-3">People</p>
      <h1 className="text-4xl font-semibold tracking-tight">Faculty</h1>
      <p className="mt-2 text-muted max-w-xl">
        Add faculty members with their official institutional email. If the
        email domain matches the institution&apos;s verified domain, Raah can
        send an affiliation verification link.
      </p>

      <Card className="mt-8 p-6">
        <p className="eyebrow mb-4">Roster</p>
        <ul className="divide-y divide-border border-y border-border">
          {(faculty ?? []).length === 0 && (
            <li className="py-4 text-sm text-muted">No faculty added yet.</li>
          )}
          {(faculty ?? []).map((f) => {
            const v = latestByFaculty.get(f.id);
            return (
              <li key={f.id} className="py-4">
                <FacultyRow
                  institutionId={institution.id}
                  faculty={f}
                  verification={v ?? null}
                  institutionDomain={institution.official_domain ?? null}
                  appUrl={APP_URL}
                />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-6 p-6">
        <p className="eyebrow mb-4">Add faculty</p>
        <AddFacultyForm
          institutionId={institution.id}
          institutionDomain={institution.official_domain ?? null}
        />
      </Card>
    </Container>
  );
}

export { StatusPill };
