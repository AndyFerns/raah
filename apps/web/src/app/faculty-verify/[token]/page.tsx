import Link from "next/link";
import { Container } from "@/components/ui";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { ConfirmForm } from "./confirm-form";

export const metadata = { title: "Faculty affiliation — Raah" };

export default async function FacultyVerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const admin = createSupabaseServiceRoleClient();
  const { data: verif } = await admin
    .from("faculty_verifications")
    .select(
      "id, status, token_expires_at, faculty:faculty_id(id, full_name, official_email, institutions(id, name, slug))"
    )
    .eq("token", token)
    .maybeSingle();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <Container className="h-16 flex items-center">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            RAAH
          </Link>
        </Container>
      </header>
      <main className="flex-1 flex items-start justify-center py-16">
        <div className="w-full max-w-lg px-6">
          <p className="eyebrow mb-3">Institutional affiliation</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Confirm your affiliation
          </h1>

          {!verif && (
            <p className="mt-6 text-sm text-muted">
              This verification link is not valid.
            </p>
          )}

          {verif && verif.status === "verified" && (
            <p className="mt-6 text-sm text-[color:var(--success)]">
              Faculty affiliation already verified.
            </p>
          )}

          {verif &&
            verif.status !== "verified" &&
            new Date(verif.token_expires_at ?? 0).getTime() < Date.now() && (
              <p className="mt-6 text-sm text-[color:var(--danger)]">
                This verification link has expired. Please ask your institution
                to send a new one.
              </p>
            )}

          {verif &&
            verif.status !== "verified" &&
            new Date(verif.token_expires_at ?? 0).getTime() >= Date.now() && (
              <VerifyBody token={token} verif={verif} />
            )}
        </div>
      </main>
    </div>
  );
}

function VerifyBody({
  token,
  verif,
}: {
  token: string;
  verif: {
    faculty: unknown;
  };
}) {
  const faculty = verif.faculty as {
    full_name: string;
    official_email: string;
    institutions: { name: string } | null;
  };
  return (
    <div className="mt-6">
      <p className="text-sm text-muted">
        You have been listed as a faculty member of:
      </p>
      <p className="mt-2 text-2xl font-semibold">
        {faculty.institutions?.name ?? "your institution"}
      </p>
      <dl className="mt-6 divide-y divide-border border-y border-border text-sm">
        <div className="py-3 flex justify-between">
          <dt className="text-muted">Faculty</dt>
          <dd>{faculty.full_name}</dd>
        </div>
        <div className="py-3 flex justify-between">
          <dt className="text-muted">Official email</dt>
          <dd className="font-mono">{faculty.official_email}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <ConfirmForm token={token} />
      </div>
    </div>
  );
}
