import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase/server";
import type { Profile } from "./supabase/types";

export type SessionContext = {
  userId: string;
  email: string | null;
  profile: Profile;
  isPlatformAdmin: boolean;
};

export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      userId: user.id,
      email: user.email ?? null,
      profile: {
        id: user.id,
        role: "citizen",
        full_name: null,
        display_name: null,
        phone: null,
        onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isPlatformAdmin: false,
    };
  }

  const { data: adminRow } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
    isPlatformAdmin: Boolean(adminRow),
  };
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in");
  return session;
}

export async function requireAdmin(): Promise<SessionContext> {
  const session = await requireSession();
  if (!session.isPlatformAdmin) redirect("/");
  return session;
}
