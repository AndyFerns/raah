import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import {
  Badge,
  Card,
  Chip,
  Container,
  KpiCard,
  LinkButton,
  SectionTitle,
  StatusPill,
} from "@/components/ui";
import {
  BuildingIcon,
  ExternalIcon,
  FolderIcon,
  HandshakeIcon,
  UserIcon,
} from "@/components/icons";
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

  const name = session.profile.full_name ?? session.email ?? "Signed in";
  const initials = getInitials(name);

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Container className="py-10 md:py-14 space-y-10">
          {/* Profile hero */}
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)] text-2xl font-semibold border border-[color:var(--border)]">
              {initials || <UserIcon size={26} />}
            </div>
            <div className="flex-1">
              <p className="eyebrow mb-1.5">Account</p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                {name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{ROLE_LABEL[session.profile.role]}</Badge>
                {session.email && <Chip>{session.email}</Chip>}
                {session.profile.onboarded && (
                  <Badge tone="success">Onboarded</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <LinkButton href="/onboarding/institution" variant="secondary">
                Register institution
              </LinkButton>
              <LinkButton href="/industry/onboarding" variant="dark">
                Register organization
              </LinkButton>
            </div>
          </div>

          {/* Quick counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              eyebrow="Memberships"
              value={memberships?.length ?? 0}
              icon={<BuildingIcon size={14} />}
            />
            <KpiCard
              eyebrow="Role"
              value={ROLE_LABEL[session.profile.role]}
              icon={<UserIcon size={14} />}
            />
            <KpiCard
              eyebrow="Projects"
              value="Browse"
              hint="Open the catalog"
              icon={<FolderIcon size={14} />}
            />
            <KpiCard
              eyebrow="Challenges"
              value="Browse"
              hint="See open challenges"
              icon={<HandshakeIcon size={14} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 lg:col-span-2">
              <SectionTitle
                eyebrow="Quick actions"
                title="What would you like to do?"
              />
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ActionTile
                  href="/institutions"
                  icon={<BuildingIcon size={18} />}
                  title="Browse institutions"
                  description="Discover verified institutions and their research capacity."
                />
                <ActionTile
                  href="/projects"
                  icon={<FolderIcon size={18} />}
                  title="View projects"
                  description="Explore projects seeking collaboration."
                />
                <ActionTile
                  href="/challenges"
                  icon={<HandshakeIcon size={18} />}
                  title="View challenges"
                  description="Real problems submitted by citizens and public bodies."
                />
                <ActionTile
                  href="/onboarding/institution"
                  icon={<BuildingIcon size={18} />}
                  title="Register an institution"
                  description="Onboard your college or research institution."
                />
              </div>
            </Card>

            <Card className="p-6">
              <SectionTitle
                eyebrow="Institutions"
                title="Your memberships"
              />
              <div className="mt-5 space-y-2">
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
                    <Link
                      key={inst.id}
                      href={`/institutions/${inst.slug}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-3 hover:bg-[color:var(--surface-2)] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inst.name}</p>
                        <div className="mt-1">
                          <StatusPill status={inst.verification_status} />
                        </div>
                      </div>
                      <ExternalIcon size={14} className="text-muted-2 shrink-0" />
                    </Link>
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

function ActionTile({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[color:var(--accent)] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}
