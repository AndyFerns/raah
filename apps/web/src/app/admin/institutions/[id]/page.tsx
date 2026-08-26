import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  Container,
  StatusPill,
} from "@/components/ui";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  INSTITUTION_TYPE_LABEL,
  VERIFICATION_STATUS_LABEL,
} from "@/lib/supabase/types";
import { AdminReviewPanel } from "./review-panel";
import { AdminDocumentList } from "./document-list";

export const metadata = { title: "Institution review — Raah admin" };

export default async function AdminInstitutionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseServiceRoleClient();

  const { data: inst } = await admin
    .from("institutions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!inst) notFound();

  const [docs, faculty, verifs, history] = await Promise.all([
    admin
      .from("verification_documents")
      .select("id, storage_path, original_name, mime_type, size_bytes, created_at")
      .eq("institution_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("faculty")
      .select("id, full_name, designation, department, official_email")
      .eq("institution_id", id),
    admin
      .from("faculty_verifications")
      .select("status, faculty!inner(institution_id, full_name)")
      .eq("faculty.institution_id", id),
    admin
      .from("institution_verifications")
      .select("id, submitted_at, decision, notes, reviewed_at")
      .eq("institution_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  const facultyTotal = faculty.data?.length ?? 0;
  const facultyVerified =
    verifs.data?.filter((v) => v.status === "verified").length ?? 0;

  return (
    <Container className="py-14 max-w-5xl">
      <p className="eyebrow mb-3">
        {INSTITUTION_TYPE_LABEL[inst.type as keyof typeof INSTITUTION_TYPE_LABEL]}
      </p>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{inst.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <StatusPill status={inst.verification_status} />
            <span className="text-sm text-muted">
              {[inst.city, inst.district, inst.state].filter(Boolean).join(", ")}
            </span>
          </div>
        </div>
        <Link
          href={`/institutions/${inst.slug}`}
          className="text-sm underline underline-offset-4"
        >
          View public page
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <p className="eyebrow mb-4">Identity</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 text-sm">
              <div>
                <dt className="text-muted">Institution code</dt>
                <dd>{inst.institution_code ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Official email</dt>
                <dd className="font-mono">{inst.official_email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Website</dt>
                <dd>
                  {inst.website ? (
                    <a
                      className="underline underline-offset-4"
                      href={inst.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {inst.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Official domain</dt>
                <dd className="font-mono">{inst.official_domain ?? "—"}</dd>
              </div>
            </dl>
            {inst.description && (
              <p className="mt-6 text-sm text-muted leading-relaxed">
                {inst.description}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <p className="eyebrow mb-4">Documents</p>
            <AdminDocumentList
              documents={(docs.data ?? []).map((d) => ({
                id: d.id,
                name: d.original_name ?? d.storage_path,
                path: d.storage_path,
                size: d.size_bytes ?? 0,
              }))}
            />
          </Card>

          <Card className="p-6">
            <p className="eyebrow mb-4">Faculty</p>
            <p className="text-sm text-muted">
              {facultyVerified} of {facultyTotal} verified.
            </p>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {(faculty.data ?? []).map((f) => (
                <li
                  key={f.id}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div>
                    <p>{f.full_name}</p>
                    <p className="text-xs text-muted font-mono">
                      {f.official_email}
                    </p>
                  </div>
                </li>
              ))}
              {(faculty.data ?? []).length === 0 && (
                <li className="py-3 text-sm text-muted">No faculty added.</li>
              )}
            </ul>
          </Card>

          <Card className="p-6">
            <p className="eyebrow mb-4">History</p>
            <ul className="divide-y divide-border border-y border-border text-sm">
              {(history.data ?? []).length === 0 && (
                <li className="py-3 text-muted">No submissions yet.</li>
              )}
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="py-3">
                  <p>
                    Submitted{" "}
                    <time className="text-muted">
                      {new Date(h.submitted_at).toLocaleString()}
                    </time>
                  </p>
                  {h.decision && (
                    <p className="text-muted">
                      Decision:{" "}
                      {VERIFICATION_STATUS_LABEL[
                        h.decision as keyof typeof VERIFICATION_STATUS_LABEL
                      ] ?? h.decision}
                      {h.reviewed_at
                        ? ` on ${new Date(h.reviewed_at).toLocaleString()}`
                        : ""}
                    </p>
                  )}
                  {h.notes && <p className="mt-1 text-xs">{h.notes}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div>
          <Card className="p-6 sticky top-6">
            <p className="eyebrow mb-4">Review</p>
            <AdminReviewPanel
              institutionId={inst.id}
              currentStatus={inst.verification_status}
            />
          </Card>
        </div>
      </div>
    </Container>
  );
}
