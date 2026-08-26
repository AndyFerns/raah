import Link from "next/link";
import { Card, Container, StatusPill } from "@/components/ui";
import { requireInstitutionMembership } from "@/lib/institution";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DocumentUploader } from "./document-uploader";
import { SubmitForReviewButton } from "./submit-button";

export const metadata = { title: "Verification — Raah" };

export default async function InstitutionVerificationPage() {
  const { institution } = await requireInstitutionMembership();
  const supabase = await createSupabaseServerClient();

  const [docs, faculty, verifs] = await Promise.all([
    supabase
      .from("verification_documents")
      .select("id, original_name, mime_type, size_bytes, storage_path, created_at")
      .eq("institution_id", institution.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("faculty")
      .select("id")
      .eq("institution_id", institution.id),
    supabase
      .from("faculty_verifications")
      .select("status, faculty!inner(institution_id)")
      .eq("faculty.institution_id", institution.id),
  ]);

  const facultyTotal = faculty.data?.length ?? 0;
  const facultyVerified =
    verifs.data?.filter((v) => v.status === "verified").length ?? 0;

  const websiteOk = Boolean(institution.website && institution.official_domain);
  const evidenceOk = (docs.data?.length ?? 0) > 0;
  const facultyOk = facultyVerified > 0;

  return (
    <Container className="py-14 max-w-4xl">
      <p className="eyebrow mb-3">Verification</p>
      <h1 className="text-4xl font-semibold tracking-tight">
        {institution.name}
      </h1>
      <div className="mt-3">
        <StatusPill status={institution.verification_status} />
      </div>

      <Card className="mt-8 p-6">
        <p className="eyebrow mb-4">Status</p>
        <ul className="divide-y divide-border border-y border-border">
          <StatusRow label="Institution registration" done />
          <StatusRow
            label="Official website"
            done={websiteOk}
            note={institution.official_domain ?? "Add website in profile"}
          />
          <StatusRow
            label="Institution evidence"
            done={evidenceOk}
            note={
              evidenceOk
                ? `${docs.data?.length} document${docs.data?.length === 1 ? "" : "s"} submitted`
                : "Upload supporting documents"
            }
          />
          <StatusRow
            label="Faculty affiliation"
            done={facultyOk}
            note={`${facultyVerified} of ${facultyTotal} verified`}
          />
          <StatusRow
            label="Administrator review"
            done={institution.verification_status === "verified"}
            note={
              institution.verification_status === "verified"
                ? "Approved"
                : institution.verification_status === "under_review"
                  ? "Under review"
                  : "Pending review"
            }
          />
        </ul>
        <div className="mt-6">
          <SubmitForReviewButton
            institutionId={institution.id}
            currentStatus={institution.verification_status}
          />
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <p className="eyebrow mb-4">Official website</p>
        <p className="text-sm">
          Website:{" "}
          {institution.website ? (
            <a
              className="underline underline-offset-4"
              href={institution.website}
              target="_blank"
              rel="noreferrer"
            >
              {institution.website}
            </a>
          ) : (
            <span className="text-muted">Not set. Add in profile.</span>
          )}
        </p>
        <p className="mt-2 text-sm">
          Domain:{" "}
          {institution.official_domain ? (
            <span className="font-mono">{institution.official_domain}</span>
          ) : (
            <span className="text-muted">Not set</span>
          )}
        </p>
      </Card>

      <Card className="mt-6 p-6">
        <p className="eyebrow mb-4">Institutional evidence</p>
        <p className="text-sm text-muted mb-4">
          Upload affiliation, recognition, or authorization documents. Files are
          stored privately and are only visible to your institution and Raah
          reviewers.
        </p>
        <DocumentUploader
          institutionId={institution.id}
          documents={(docs.data ?? []).map((d) => ({
            id: d.id,
            name: d.original_name ?? d.storage_path.split("/").pop() ?? "document",
            size: d.size_bytes ?? 0,
            path: d.storage_path,
          }))}
        />
      </Card>

      <Card className="mt-6 p-6">
        <p className="eyebrow mb-4">Faculty affiliation</p>
        <p className="text-sm text-muted mb-4">
          Faculty listed with an official institutional email will receive an
          affiliation verification link. Manage faculty from the{" "}
          <Link href="/institution/people" className="underline underline-offset-4">
            People
          </Link>{" "}
          page.
        </p>
        <p className="text-sm">
          {facultyVerified} of {facultyTotal} faculty verified.
        </p>
      </Card>
    </Container>
  );
}

function StatusRow({
  label,
  done,
  note,
}: {
  label: string;
  done: boolean;
  note?: string;
}) {
  return (
    <li className="py-3 flex items-center justify-between text-sm">
      <div>
        <p className="text-foreground">{label}</p>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
      <span
        className={
          done
            ? "text-[color:var(--success)] text-xs uppercase tracking-wider"
            : "text-muted text-xs uppercase tracking-wider"
        }
      >
        {done ? "Complete" : "Pending"}
      </span>
    </li>
  );
}
