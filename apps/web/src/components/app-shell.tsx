import Link from "next/link";
import type { ReactNode } from "react";
import { RaahMark } from "./mark";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";
import { UserIcon } from "./icons";
import { NavLinkClient, MobileTabsClient } from "./app-shell-client";

export type AppNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match?: string;
};

export function AppShell({
  brand,
  primary,
  secondary,
  user,
  children,
}: {
  brand: { title: string; subtitle?: string; href: string };
  primary: AppNavItem[];
  secondary?: AppNavItem[];
  user: { name: string; role: string; email?: string | null };
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[color:var(--background)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[248px_1fr]">
        <Sidebar brand={brand} primary={primary} secondary={secondary} />
        <div className="flex min-h-screen flex-col">
          <TopBar user={user} />
          <main className="flex-1 px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  brand,
  primary,
  secondary,
}: {
  brand: { title: string; subtitle?: string; href: string };
  primary: AppNavItem[];
  secondary?: AppNavItem[];
}) {
  return (
    <aside className="hidden lg:flex sticky top-0 h-screen flex-col border-r border-[color:var(--border)] bg-[color:var(--sidebar-bg)] px-5 py-6">
      <Link
        href={brand.href}
        className="mb-8 flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[color:var(--surface-2)] transition-colors"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--surface)] border border-[color:var(--border)]">
          <RaahMark size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground leading-none">
            {brand.title}
          </p>
          {brand.subtitle && (
            <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-2">
              {brand.subtitle}
            </p>
          )}
        </div>
      </Link>

      <nav className="flex-1 space-y-1">
        {primary.map((item) => (
          <NavLinkClient
            key={item.href}
            href={item.href}
            match={item.match}
            label={item.label}
          >
            {item.icon}
          </NavLinkClient>
        ))}
        {secondary && secondary.length > 0 && (
          <>
            <div className="mt-6 mb-2 px-3 text-[10px] uppercase tracking-widest text-muted-2">
              Explore
            </div>
            {secondary.map((item) => (
              <NavLinkClient
                key={item.href}
                href={item.href}
                match={item.match}
                label={item.label}
              >
                {item.icon}
              </NavLinkClient>
            ))}
          </>
        )}
      </nav>

      <div className="mt-6 space-y-2">
        <ThemeToggle />
        <SignOutButton full />
      </div>
    </aside>
  );
}

function TopBar({
  user,
}: {
  user: { name: string; role: string; email?: string | null };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-5 md:px-8 lg:px-10 border-b border-[color:var(--border)] bg-[color:var(--topbar-bg)] backdrop-blur-md">
      <Link
        href="/"
        className="lg:hidden flex items-center gap-2 font-semibold text-foreground"
      >
        <RaahMark size={20} />
        <span>Raah</span>
      </Link>

      <div className="hidden lg:block flex-1" />

      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <ThemeToggle compact />
        </div>
        <div className="hidden lg:flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] pl-3 pr-1 py-1">
          <div className="text-right leading-tight">
            <p className="text-xs font-medium text-foreground">{user.name}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-2">
              {user.role}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-inset)] text-foreground">
            <UserIcon size={16} />
          </div>
        </div>
        <div className="lg:hidden">
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

export function MobileTabs({ items }: { items: AppNavItem[] }) {
  return (
    <MobileTabsClient
      items={items.map((i) => ({
        href: i.href,
        label: i.label,
        match: i.match,
        icon: i.icon,
      }))}
    />
  );
}
