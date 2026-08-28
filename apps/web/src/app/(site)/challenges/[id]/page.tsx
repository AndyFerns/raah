import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IssueDetail } from "@/app/government/issue-detail";
import type { IssueWithMedia } from "@/app/government/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Challenge — Raah" };

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      backHref="/challenges"
      backLabel="All challenges"
    />
  );
}
