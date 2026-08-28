"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isActive(
  href: string,
  match: string | undefined,
  path: string,
): boolean {
  if (match) return new RegExp(match).test(path);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

export function NavLinkClient({
  href,
  match,
  label,
  children,
}: {
  href: string;
  match?: string;
  label: string;
  children: ReactNode;
}) {
  const path = usePathname() ?? "/";
  const active = isActive(href, match, path);
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl px-3 h-10 text-sm transition-colors ${
        active
          ? "bg-[color:var(--surface)] text-foreground border border-[color:var(--border)] shadow-[var(--shadow-xs)]"
          : "text-muted hover:text-foreground hover:bg-[color:var(--surface-2)] border border-transparent"
      }`}
    >
      <span
        className={`inline-flex ${active ? "text-[color:var(--accent)]" : "text-muted-2 group-hover:text-foreground"}`}
      >
        {children}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export type MobileTabItem = {
  href: string;
  label: string;
  match?: string;
  icon: ReactNode;
};

export function MobileTabsClient({ items }: { items: MobileTabItem[] }) {
  const path = usePathname() ?? "/";
  return (
    <div className="lg:hidden -mx-5 md:-mx-8 mb-6 border-b border-[color:var(--border)] bg-[color:var(--surface-2)]">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin px-5 md:px-8 py-2">
        {items.map((item) => {
          const active = isActive(item.href, item.match, path);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-2 rounded-full px-3 h-9 text-xs whitespace-nowrap border transition-colors ${
                active
                  ? "border-[color:var(--foreground)] bg-[color:var(--foreground)] text-[color:var(--background)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface)] text-foreground hover:bg-[color:var(--surface-inset)]"
              }`}
            >
              <span
                className={
                  active ? "" : "text-muted-2 group-hover:text-foreground"
                }
              >
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
