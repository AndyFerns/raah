import { requireSession } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/supabase/types";
import { GovShell } from "./gov-shell";

export default async function GovernmentLayout({
  children,
}: LayoutProps<"/">) {
  const session = await requireSession();
  return (
    <GovShell
      user={{
        name: session.profile.full_name ?? session.email ?? "Signed in",
        role: ROLE_LABEL[session.profile.role],
        email: session.email,
      }}
    >
      {children}
    </GovShell>
  );
}
