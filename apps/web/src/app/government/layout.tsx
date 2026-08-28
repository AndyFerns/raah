import { AppShell, MobileTabs, type AppNavItem } from "@/components/app-shell";
import {
  BuildingIcon,
  FolderIcon,
  HandshakeIcon,
  LayoutIcon,
  MapPinIcon,
} from "@/components/icons";
import { requireSession } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/supabase/types";

export default async function GovernmentLayout({
  children,
}: LayoutProps<"/">) {
  const session = await requireSession();

  const primary: AppNavItem[] = [
    {
      href: "/government",
      label: "Issues map",
      icon: <MapPinIcon size={18} />,
      match: "^/government(?:/)?$",
    },
  ];

  const secondary: AppNavItem[] = [
    { href: "/challenges", label: "Challenges", icon: <HandshakeIcon size={18} /> },
    { href: "/institutions", label: "Institutions", icon: <BuildingIcon size={18} /> },
    { href: "/projects", label: "Projects", icon: <FolderIcon size={18} /> },
    { href: "/", label: "Public site", icon: <LayoutIcon size={18} /> },
  ];

  return (
    <AppShell
      brand={{ title: "Raah", subtitle: "Government", href: "/government" }}
      primary={primary}
      secondary={secondary}
      user={{
        name: session.profile.full_name ?? session.email ?? "Signed in",
        role: ROLE_LABEL[session.profile.role],
        email: session.email,
      }}
    >
      <MobileTabs items={primary} />
      {children}
    </AppShell>
  );
}
