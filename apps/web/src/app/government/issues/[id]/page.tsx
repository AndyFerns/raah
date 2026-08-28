import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IssueDetail } from "../../issue-detail";
import type { IssueWithMedia } from "../../types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Issue — Government" };

export default async function GovernmentIssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/sign-in?next=/government");
  if (session.profile.role !== "government" && !session.isPlatformAdmin) {
    redirect("/account");
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("issues")
    .select(
      `
      id, user_id, title, description, category, status, location_name,
      latitude, longitude, support_count, view_count, created_at, updated_at,
      issue_media (
        id, issue_id, storage_path, original_name, mime_type, type, size_bytes, created_at
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  return (
    <IssueDetail
      issue={data as unknown as IssueWithMedia}
      backHref="/government"
      backLabel="Back to map"
    />
  );
}
