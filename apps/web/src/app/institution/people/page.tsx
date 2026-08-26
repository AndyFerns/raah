import { Card, Container, StatusPill } from "@/components/ui";
import { requireInstitutionMembership } from "@/lib/institution";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { APP_URL } from "@/lib/supabase/env";
import { AddFacultyForm } from "./add-form";
import { FacultyRow } from "./faculty-row";
import { PendingRequests } from "./pending-requests";

export const metadata = { title: "People — Raah" };

export default async function InstitutionPeoplePage() {
  const { institution, isAdminMember } = await requireInstitutionMembership();
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

  // Pending join requests (admins only).
  let pendingRows: { user_id: string; full_name: string | null; email: string | null }[] = [];
  if (isAdminMember) {
    const { data: pending } = await supabase
      .from("institution_members")
      .select("user_id, profiles(full_name)")
      .eq("institution_id", institution.id)
      .eq("status", "pending");
    if (pending && pending.length > 0) {
      const admin = createSupabaseServiceRoleClient();
      const rows: typeof pendingRows = [];
      for (const p of pending) {
        const { data: authUser } = await admin.auth.admin.getUserById(p.user_id);
        rows.push({
          user_id: p.user_id,
          full_name:
            (p.profiles as unknown as { full_name?: string | null })?.full_name ?? null,
          email: authUser.user?.email ?? null,
        });
      }
      pendingRows = rows;
    }
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

      {isAdminMember && (
        <Card className="mt-8 p-6">
          <p className="eyebrow mb-4">Join requests</p>
          <PendingRequests institutionId={institution.id} initial={pendingRows} />
        </Card>
      )}

      <Card className="mt-6 p-6">
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
