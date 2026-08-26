import Link from "next/link";
import { Card, Container, StatusPill } from "@/components/ui";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INSTITUTION_TYPE_LABEL } from "@/lib/supabase/types";

export const metadata = { title: "Admin — Raah" };

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();

  const { data: institutions } = await supabase
    .from("institutions")
    .select(
      "id, slug, name, type, verification_status, official_domain, website, created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <Container className="py-14">
      <p className="eyebrow mb-3">Administration</p>
      <h1 className="text-4xl font-semibold tracking-tight">Institutions</h1>
      <p className="mt-2 text-muted">
        Review submissions, verify institutions and manage status.
      </p>

      <Card className="mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border">
              <th className="p-4 eyebrow font-normal">Institution</th>
              <th className="p-4 eyebrow font-normal">Type</th>
              <th className="p-4 eyebrow font-normal">Domain</th>
              <th className="p-4 eyebrow font-normal">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {(institutions ?? []).map((i) => (
              <tr key={i.id} className="border-b border-border last:border-b-0">
                <td className="p-4">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted">{i.slug}</p>
                </td>
                <td className="p-4 text-muted">
                  {INSTITUTION_TYPE_LABEL[i.type as keyof typeof INSTITUTION_TYPE_LABEL]}
                </td>
                <td className="p-4 font-mono text-xs text-muted">
                  {i.official_domain ?? "—"}
                </td>
                <td className="p-4">
                  <StatusPill status={i.verification_status} />
                </td>
                <td className="p-4 text-right">
                  <Link
                    className="text-sm underline underline-offset-4"
                    href={`/admin/institutions/${i.id}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {(institutions ?? []).length === 0 && (
              <tr>
                <td className="p-6 text-muted" colSpan={5}>
                  No institutions have registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </Container>
  );
}
