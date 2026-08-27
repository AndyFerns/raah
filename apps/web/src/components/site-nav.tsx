import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RaahMark } from "./mark";
import { SignOutButton } from "./sign-out-button";
import { Container } from "./ui";

type NavItem = { href: string; label: string };

const publicNav: NavItem[] = [
  { href: "/challenges", label: "Challenges" },
  { href: "/institutions", label: "Institutions" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

const INDUSTRY_ROLES = new Set(["industry", "csr", "research_org"]);

export async function SiteNav() {
  const session = await getSession();

  const isIndustry = session
    ? INDUSTRY_ROLES.has(session.profile.role)
    : false;

  let institutionSlug: string | null = null;
  if (session?.profile.role === "institution") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("institution_members")
      .select("institution_id, institutions(slug)")
      .eq("user_id", session.userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    const inst = (data as unknown as { institutions?: { slug?: string } | null })
      ?.institutions;
    institutionSlug = inst?.slug ?? null;
  }

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-[1px] sticky top-0 z-40">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
        >
          <RaahMark size={22} />
          <span>Raah</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground hover:text-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {!session && (
            <>
              <Link
                href="/auth/sign-in"
                className="hidden sm:inline-flex text-sm text-foreground hover:text-muted"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center h-9 px-4 text-sm font-medium border border-[color:var(--accent)] bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-hover)]"
              >
                Get started
              </Link>
            </>
          )}
          {session && (
            <>
              <Link
                href={
                  session.isPlatformAdmin
                    ? "/admin"
                    : session.profile.role === "institution"
                      ? "/institution"
                      : isIndustry
                        ? "/industry"
                        : "/account"
                }
                className="text-sm text-foreground hover:text-muted"
              >
                {session.isPlatformAdmin
                  ? "Admin"
                  : session.profile.role === "institution"
                    ? "Institution"
                    : isIndustry
                      ? "Industry"
                      : "Account"}
              </Link>
              <SignOutButton />
            </>
          )}
        </div>
      </Container>
      {isIndustry && (
        <div className="border-t border-border bg-[color:var(--surface-2)]">
          <Container className="flex h-11 items-center gap-6 text-sm">
            <Link href="/industry" className="text-foreground hover:text-muted">
              Overview
            </Link>
            <Link
              href="/industry/interests"
              className="text-foreground hover:text-muted"
            >
              Interests
            </Link>
            <Link href="/projects" className="text-foreground hover:text-muted">
              Projects
            </Link>
            <Link
              href="/institutions"
              className="text-foreground hover:text-muted"
            >
              Institutions
            </Link>
          </Container>
        </div>
      )}
      {session?.profile.role === "institution" && (
        <div className="border-t border-border bg-[color:var(--surface-2)]">
          <Container className="flex h-11 items-center gap-6 text-sm">
            <Link href="/institution" className="text-foreground hover:text-muted">
              Overview
            </Link>
            <Link href="/institution/profile" className="text-foreground hover:text-muted">
              Institution
            </Link>
            <Link href="/institution/people" className="text-foreground hover:text-muted">
              People
            </Link>
            <Link href="/institution/verification" className="text-foreground hover:text-muted">
              Verification
            </Link>
            <Link href="/challenges" className="text-foreground hover:text-muted">
              Challenges
            </Link>
            <Link href="/projects" className="text-foreground hover:text-muted">
              Projects
            </Link>
            {institutionSlug && (
              <Link
                href={`/institutions/${institutionSlug}`}
                className="ml-auto text-muted hover:text-foreground"
              >
                View public page
              </Link>
            )}
          </Container>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-[color:var(--surface)]">
      <Container className="py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-muted">
        <div className="flex items-start gap-3">
          <RaahMark size={22} tone="accent" />
          <div>
            <p className="text-foreground font-medium">Raah</p>
            <p className="mt-1">Finding a Pathway for Societal Challenges</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/institutions" className="hover:text-foreground">
            Institutions
          </Link>
          <Link href="/challenges" className="hover:text-foreground">
            Challenges
          </Link>
        </div>
      </Container>
    </footer>
  );
}
