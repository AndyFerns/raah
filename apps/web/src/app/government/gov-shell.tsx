"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  BuildingIcon,
  CloseIcon,
  FolderIcon,
  HandshakeIcon,
  LayoutIcon,
  MapPinIcon,
} from "@/components/icons";
import { RaahMark } from "@/components/mark";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const PRIMARY: NavItem[] = [
  { href: "/government", label: "Issues map", icon: <MapPinIcon size={18} /> },
];

const SECONDARY: NavItem[] = [
  { href: "/challenges", label: "Challenges", icon: <HandshakeIcon size={18} /> },
  { href: "/institutions", label: "Institutions", icon: <BuildingIcon size={18} /> },
  { href: "/projects", label: "Projects", icon: <FolderIcon size={18} /> },
  { href: "/", label: "Public site", icon: <LayoutIcon size={18} /> },
];

export function GovShell({
  user,
  children,
}: {
  user: { name: string; role: string; email?: string | null };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while this shell is mounted so the map never causes
  // page-level scrollbars.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  // Close on Escape when the sidebar is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="gov-shell">
      <main className="gov-main">{children}</main>

      {/* Circular Raah toggle — top-left, always on top */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="gov-sidebar"
        className={`gov-toggle ${open ? "gov-toggle--open" : ""}`}
      >
        <RaahMark size={22} />
      </button>

      {/* Scrim */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`gov-scrim ${open ? "gov-scrim--open" : ""}`}
      />

      {/* Sidebar drawer */}
      <aside
        id="gov-sidebar"
        aria-label="Government navigation"
        className={`gov-sidebar ${open ? "gov-sidebar--open" : ""}`}
      >
        <div className="gov-sidebar-head">
          <div className="gov-sidebar-brand">
            <div className="gov-sidebar-brand-mark">
              <RaahMark size={18} />
            </div>
            <div>
              <p className="gov-sidebar-brand-title">Raah</p>
              <p className="gov-sidebar-brand-sub">Government</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="gov-sidebar-close"
            onClick={() => setOpen(false)}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="gov-sidebar-user">
          <p className="gov-sidebar-user-name">{user.name}</p>
          <p className="gov-sidebar-user-role">{user.role}</p>
        </div>

        <nav className="gov-sidebar-nav">
          {PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="gov-sidebar-link"
            >
              <span className="gov-sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <p className="gov-sidebar-section">Explore</p>
          {SECONDARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="gov-sidebar-link"
            >
              <span className="gov-sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="gov-sidebar-foot">
          <ThemeToggle />
          <SignOutButton full />
        </div>
      </aside>

      <style>{`
        .gov-shell {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: var(--background);
        }

        .gov-main {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        /* -------------------------------------------------------- */
        /* Circular toggle — Raah mark                              */
        /* -------------------------------------------------------- */
        .gov-toggle {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 60;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--foreground);
          box-shadow: var(--shadow-md);
          transition:
            transform 180ms cubic-bezier(0.4, 0, 0.2, 1),
            background 180ms ease,
            box-shadow 180ms ease;
        }
        .gov-toggle:hover {
          transform: scale(1.05);
          background: var(--surface);
        }
        .gov-toggle:active {
          transform: scale(0.96);
        }
        .gov-toggle--open {
          background: var(--surface);
        }

        /* -------------------------------------------------------- */
        /* Scrim + Drawer                                            */
        /* -------------------------------------------------------- */
        .gov-scrim {
          position: fixed;
          inset: 0;
          background: rgba(10, 8, 4, 0.4);
          opacity: 0;
          pointer-events: none;
          transition: opacity 220ms ease;
          z-index: 55;
        }
        .gov-scrim--open {
          opacity: 1;
          pointer-events: auto;
        }

        .gov-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: min(300px, 88vw);
          background: var(--sidebar-bg, var(--surface));
          border-right: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          transform: translateX(-105%);
          transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 58;
          padding: 20px 16px 16px;
        }
        .gov-sidebar--open {
          transform: translateX(0);
        }

        .gov-sidebar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-left: 60px;
          margin-bottom: 16px;
        }
        .gov-sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .gov-sidebar-brand-mark {
          height: 36px;
          width: 36px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--surface);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .gov-sidebar-brand-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
          color: var(--foreground);
          line-height: 1;
        }
        .gov-sidebar-brand-sub {
          margin: 4px 0 0;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted-2);
        }
        .gov-sidebar-close {
          height: 32px;
          width: 32px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 150ms ease, color 150ms ease;
        }
        .gov-sidebar-close:hover {
          background: var(--surface-2);
          color: var(--foreground);
        }

        .gov-sidebar-user {
          margin: 4px 6px 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
        }
        .gov-sidebar-user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--foreground);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gov-sidebar-user-role {
          margin: 4px 0 0;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted-2);
        }

        .gov-sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
          padding: 4px 2px;
        }

        .gov-sidebar-section {
          margin: 14px 8px 4px;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted-2);
        }

        .gov-sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 12px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 13px;
          color: var(--muted);
          text-decoration: none;
          transition:
            background 150ms ease,
            color 150ms ease,
            border-color 150ms ease;
        }
        .gov-sidebar-link:hover {
          background: var(--surface-2);
          color: var(--foreground);
        }
        .gov-sidebar-link-icon {
          display: inline-flex;
          color: var(--muted-2);
        }
        .gov-sidebar-link:hover .gov-sidebar-link-icon {
          color: var(--foreground);
        }

        .gov-sidebar-foot {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (prefers-reduced-motion: reduce) {
          .gov-toggle,
          .gov-scrim,
          .gov-sidebar {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
