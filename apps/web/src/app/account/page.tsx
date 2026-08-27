import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import { Card, Container, LinkButton, SectionTitle } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/supabase/types";

export const metadata = { title: "Account — Raah" };

export default async function AccountPage() {
  const session = await requireSession();

  if (session.profile.role === "institution") {
    redirect("/institution");
  }
  if (
    session.profile.role === "industry" ||
    session.profile.role === "csr" ||
    session.profile.role === "research_org"
  ) {
    redirect("/industry");
  }

  const supabase = await createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("institution_members")
    .select("role, institutions(id, slug, name, verification_status)")
    .eq("user_id", session.userId);

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Container className="py-14">
          <p className="eyebrow mb-3">Account</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            {session.profile.full_name ?? session.email}
          </h1>
          <p className="mt-2 text-muted">
            Signed in as {ROLE_LABEL[session.profile.role]}.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <SectionTitle
                eyebrow="Quick actions"
                title="What would you like to do?"
              />
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href="/institutions" variant="secondary">
                  Browse institutions
                </LinkButton>
                <LinkButton href="/challenges" variant="secondary">
                  View challenges
                </LinkButton>
                <LinkButton href="/onboarding/institution" variant="secondary">
                  Register an institution
                </LinkButton>
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle
                eyebrow="Institutions"
                title="Institutions you belong to"
              />
              <div className="mt-6 space-y-3">
                {(memberships ?? []).length === 0 && (
                  <p className="text-sm text-muted">
                    You are not linked to an institution yet.
                  </p>
                )}
                {(memberships ?? []).map((m) => {
                  const inst = m.institutions as unknown as {
                    id: string;
                    slug: string;
                    name: string;
                    verification_status: string;
                  };
                  return (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between border-t border-border pt-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{inst.name}</p>
                        <p className="text-xs text-muted uppercase tracking-wider">
                          {inst.verification_status.replace("_", " ")}
                        </p>
                      </div>
                      <Link
                        href={`/institutions/${inst.slug}`}
                        className="text-sm underline underline-offset-4"
                      >
                        View
                      </Link>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
