import Link from "next/link";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { Container } from "./ui";

type NavItem = { href: string; label: string };

const publicNav: NavItem[] = [
  { href: "/challenges", label: "Challenges" },
  { href: "/institutions", label: "Institutions" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

export async function SiteNav() {
  const session = await getSession();

  let institutionSlug: string | null = null;
  if (session?.profile.role === "institution") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("institution_members")
      .select("institution_id, institutions(slug)")
      .eq("user_id", session.userId)
      .limit(1)
      .maybeSingle();
    const inst = (data as unknown as { institutions?: { slug?: string } | null })
      ?.institutions;
    institutionSlug = inst?.slug ?? null;
  }

  return (
    <header className="border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          RAAH
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
                className="inline-flex items-center h-9 px-4 text-sm font-medium border border-foreground bg-foreground text-background hover:bg-neutral-800"
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
                      : "/account"
                }
                className="text-sm text-foreground hover:text-muted"
              >
                {session.isPlatformAdmin
                  ? "Admin"
                  : session.profile.role === "institution"
                    ? "Institution"
                    : "Account"}
              </Link>
              <SignOutButton />
            </>
          )}
        </div>
      </Container>
      {session?.profile.role === "institution" && (
        <div className="border-t border-border bg-surface">
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
    <footer className="mt-24 border-t border-border">
      <Container className="py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-muted">
        <div>
          <p className="text-foreground font-medium">Raah</p>
          <p className="mt-1">Finding a Pathway for Societal Challenges</p>
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
