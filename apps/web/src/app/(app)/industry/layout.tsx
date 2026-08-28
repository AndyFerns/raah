import { AppShell, MobileTabs, type AppNavItem } from "@/components/app-shell";
import {
  FolderIcon,
  HandshakeIcon,
  LayoutIcon,
  SparkleIcon,
  BuildingIcon,
} from "@/components/icons";
import { requireSession } from "@/lib/auth";
import { getIndustryContext } from "@/lib/industry";
import { ROLE_LABEL } from "@/lib/supabase/types";

export default async function IndustryAppLayout({
  children,
}: LayoutProps<"/industry">) {
  const session = await requireSession();
  const ctx = await getIndustryContext();

  const primary: AppNavItem[] = [
    {
      href: "/industry",
      label: "Overview",
      icon: <LayoutIcon size={18} />,
      match: "^/industry(?:/)?$",
    },
    {
      href: "/projects",
      label: "Projects",
      icon: <FolderIcon size={18} />,
    },
    {
      href: "/industry/interests",
      label: "Interests",
      icon: <SparkleIcon size={18} />,
    },
  ];

  if (!ctx) {
    primary.push({
      href: "/industry/onboarding",
      label: "Set up organization",
      icon: <HandshakeIcon size={18} />,
    });
  }

  const secondary: AppNavItem[] = [
    { href: "/institutions", label: "Institutions", icon: <BuildingIcon size={18} /> },
    { href: "/challenges", label: "Challenges", icon: <HandshakeIcon size={18} /> },
  ];

  const name =
    ctx?.organization.name ??
    session.profile.full_name ??
    session.email ??
    "Signed in";

  return (
    <AppShell
      brand={{
        title: "Raah",
        subtitle: "Industry portal",
        href: "/industry",
      }}
      primary={primary}
      secondary={secondary}
      user={{
        name,
        role: ROLE_LABEL[session.profile.role],
        email: session.email,
      }}
    >
      <MobileTabs items={primary} />
      {children}
    </AppShell>
  );
}
