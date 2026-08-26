import { Card, Container } from "@/components/ui";
import { requireInstitutionMembership } from "@/lib/institution";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InstitutionProfileEditor } from "./editor";
import { ListManager } from "./list-manager";

export const metadata = { title: "Institution profile — Raah" };

export default async function InstitutionProfilePage() {
  const { institution } = await requireInstitutionMembership();
  const supabase = await createSupabaseServerClient();

  const [depts, areas, caps, facs] = await Promise.all([
    supabase.from("departments").select("id, name").eq("institution_id", institution.id).order("name"),
    supabase.from("institution_research_areas").select("id, area").eq("institution_id", institution.id).order("area"),
    supabase.from("institution_capabilities").select("id, capability").eq("institution_id", institution.id).order("capability"),
    supabase.from("institution_facilities").select("id, name, description").eq("institution_id", institution.id).order("name"),
  ]);

  return (
    <Container className="py-14 max-w-5xl">
      <p className="eyebrow mb-3">Institution</p>
      <h1 className="text-4xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-2 text-muted max-w-xl">
        Public information about your institution. Structured fields help Raah
        match challenges to the right expertise.
      </p>

      <div className="mt-10 space-y-10">
        <Card className="p-6">
          <p className="eyebrow mb-4">Identity</p>
          <InstitutionProfileEditor institution={institution} />
        </Card>

        <Card className="p-6">
          <p className="eyebrow mb-4">Departments</p>
          <ListManager
            kind="departments"
            institutionId={institution.id}
            items={(depts.data ?? []).map((d) => ({ id: d.id, label: d.name }))}
            placeholder="e.g. Computer Science"
          />
        </Card>

        <Card className="p-6">
          <p className="eyebrow mb-4">Research areas</p>
          <ListManager
            kind="research_areas"
            institutionId={institution.id}
            items={(areas.data ?? []).map((r) => ({ id: r.id, label: r.area }))}
            placeholder="e.g. Renewable energy"
          />
        </Card>

        <Card className="p-6">
          <p className="eyebrow mb-4">Technical capabilities</p>
          <ListManager
            kind="capabilities"
            institutionId={institution.id}
            items={(caps.data ?? []).map((c) => ({ id: c.id, label: c.capability }))}
            placeholder="e.g. Machine learning"
          />
        </Card>

        <Card className="p-6">
          <p className="eyebrow mb-4">Facilities</p>
          <ListManager
            kind="facilities"
            institutionId={institution.id}
            items={(facs.data ?? []).map((f) => ({
              id: f.id,
              label: f.name,
              sub: f.description ?? undefined,
            }))}
            placeholder="e.g. Fabrication laboratory"
          />
        </Card>
      </div>
    </Container>
  );
}
