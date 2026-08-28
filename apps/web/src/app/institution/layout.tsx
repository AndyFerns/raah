import { AppShell, MobileTabs, type AppNavItem } from "@/components/app-shell";
import {
  BuildingIcon,
  FolderIcon,
  HandshakeIcon,
  LayoutIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type Institution } from "@/lib/supabase/types";

export default async function InstitutionLayout({
  children,
}: LayoutProps<"/">) {
  const session = await requireSession();

  const primary: AppNavItem[] = [
    {
      href: "/institution",
      label: "Overview",
      icon: <LayoutIcon size={18} />,
      match: "^/institution(?:/)?$",
    },
    {
      href: "/institution/profile",
      label: "Institution",
      icon: <BuildingIcon size={18} />,
    },
    {
      href: "/institution/people",
      label: "People",
      icon: <UserIcon size={18} />,
    },
    {
      href: "/institution/verification",
      label: "Verification",
      icon: <SettingsIcon size={18} />,
    },
  ];

  const secondary: AppNavItem[] = [
    { href: "/challenges", label: "Challenges", icon: <HandshakeIcon size={18} /> },
    { href: "/projects", label: "Projects", icon: <FolderIcon size={18} /> },
  ];

  // Soft lookup for institution name (no redirect from the layout itself —
  // child pages still call requireInstitutionMembership() and redirect if
  // needed).
  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from("institution_members")
    .select("institutions(*)")
    .eq("user_id", session.userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const inst = (membership as unknown as { institutions?: Institution | null })
    ?.institutions;
  const institutionName =
    inst?.name ?? session.profile.full_name ?? session.email ?? "Institution";

  return (
    <AppShell
      brand={{ title: "Raah", subtitle: "Institution", href: "/institution" }}
      primary={primary}
      secondary={secondary}
      user={{
        name: institutionName,
        role: ROLE_LABEL[session.profile.role],
        email: session.email,
      }}
    >
      <MobileTabs items={primary} />
      {children}
    </AppShell>
  );
}
