import Link from "next/link";
import { getSession } from "@/lib/auth";
import { RaahMark } from "./mark";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";
import { Container, LinkButton } from "./ui";

type NavItem = { href: string; label: string };

const publicNav: NavItem[] = [
  { href: "/challenges", label: "Challenges" },
  { href: "/projects", label: "Projects" },
  { href: "/institutions", label: "Institutions" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

const INDUSTRY_ROLES = new Set(["industry", "csr", "research_org"]);

function dashboardHref(session: {
  isPlatformAdmin: boolean;
  profile: { role: string };
}) {
  if (session.isPlatformAdmin) return "/admin";
  if (session.profile.role === "institution") return "/institution";
  if (INDUSTRY_ROLES.has(session.profile.role)) return "/industry";
  if (session.profile.role === "government") return "/government";
  return "/account";
}

export async function SiteNav() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[color:var(--topbar-bg)] border-b border-[color:var(--border)]">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-foreground"
        >
          <RaahMark size={22} />
          <span>Raah</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          {!session && (
            <>
              <Link
                href="/auth/sign-in"
                className="hidden sm:inline-flex text-sm text-foreground hover:text-muted px-3"
              >
                Sign in
              </Link>
              <LinkButton href="/auth/register" size="sm" variant="dark">
                Get started
              </LinkButton>
            </>
          )}
          {session && (
            <>
              <LinkButton
                href={dashboardHref(session)}
                variant="secondary"
                size="sm"
              >
                Dashboard
              </LinkButton>
              <SignOutButton />
            </>
          )}
        </div>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-[color:var(--border)] bg-[color:var(--surface-2)]">
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
