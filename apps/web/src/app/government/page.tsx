import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GovernmentDashboard } from "./government-dashboard";
import type { IssueWithMedia } from "./types";

export const metadata = { title: "Government Dashboard — Raah" };

export default async function GovernmentPage() {
  /* ── Auth gate ─────────────────────────────────────────────── */
  console.log("[GOV DASHBOARD] Checking session...");
  // const session = await getSession();
  // if (!session) {
  //   console.log("[GOV DASHBOARD] No session found. Redirecting to sign-in.");
  //   redirect("/auth/sign-in");
  // }

  // const role = session.profile.role;
  // console.log(`[GOV DASHBOARD] Session found. User role: ${role}, Admin: ${session.isPlatformAdmin}`);
  
  // if (role !== "government" && role !== "admin" && !session.isPlatformAdmin) {
  //   console.log(`[GOV DASHBOARD] Access denied for role: ${role}. Redirecting to home.`);
  //   redirect("/");
  // }
  
  console.log("[GOV DASHBOARD] Access granted (BYPASSED). Fetching issues...");

  /* ── Fetch issues with media ───────────────────────────────── */
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("issues")
    .select(
      `
      id,
      user_id,
      title,
      description,
      category,
      status,
      location_name,
      latitude,
      longitude,
      support_count,
      view_count,
      created_at,
      updated_at,
      issue_media (
        id,
        issue_id,
        storage_path,
        original_name,
        mime_type,
        type,
        size_bytes,
        created_at
      )
    `
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false });

  const issues: IssueWithMedia[] = error ? [] : (data as IssueWithMedia[]);

  return <GovernmentDashboard issues={issues} fetchError={error?.message ?? null} />;
}
