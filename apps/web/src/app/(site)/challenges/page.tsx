import Link from "next/link";
import {
  Badge,
  Card,
  Chip,
  Container,
  EmptyState,
  KpiCard,
  SectionTitle,
} from "@/components/ui";
import {
  ArrowRightIcon,
  HandshakeIcon,
  ImageIcon,
  MapPinIcon,
  SparkleIcon,
} from "@/components/icons";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Challenges — Raah" };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const CATEGORY_LABEL: Record<string, string> = {
  roads: "Roads",
  water: "Water",
  sanitation: "Sanitation",
  electricity: "Electricity",
  street_lighting: "Street Lighting",
  drainage: "Drainage",
  public_safety: "Public Safety",
  environment: "Environment",
  public_property: "Public Property",
  other: "Other",
};

const STATUS_TONE: Record<
  string,
  "neutral" | "warning" | "success" | "danger" | "info"
> = {
  reported: "info",
  acknowledged: "warning",
  in_progress: "warning",
  resolved: "success",
  rejected: "danger",
  closed: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};

function mediaUrl(storagePath: string): string {
  if (storagePath.startsWith("http")) return storagePath;
  return `${SUPABASE_URL}/storage/v1/object/public/issue-media/${storagePath}`;
}

type ChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  support_count: number;
  view_count: number;
  created_at: string;
  issue_media: { id: string; storage_path: string; type: string }[] | null;
};

export default async function ChallengesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("issues")
    .select(
      `
      id, title, description, category, status, location_name,
      latitude, longitude, support_count, view_count, created_at,
      issue_media ( id, storage_path, type )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(60);

  const rows = (data ?? []) as ChallengeRow[];

  const totalChallenges = rows.length;
  const openCount = rows.filter(
    (r) => r.status === "reported" || r.status === "acknowledged",
  ).length;
  const inProgressCount = rows.filter((r) => r.status === "in_progress").length;
  const resolvedCount = rows.filter((r) => r.status === "resolved").length;

  return (
    <Container className="py-10 md:py-14 space-y-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <SectionTitle
          eyebrow="Challenges"
          title="Real problems, waiting for pathways"
          description="Community-reported challenges from citizens and public bodies. Institutions and industry can adopt these, propose solutions, and take them to pilot."
        />
        <Link
          href="/challenges/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[color:var(--foreground)] text-[color:var(--background)] text-sm font-medium hover:opacity-90 transition-opacity self-start"
        >
          Submit a challenge
          <ArrowRightIcon size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          eyebrow="Total"
          value={totalChallenges}
          icon={<HandshakeIcon size={14} />}
        />
        <KpiCard
          eyebrow="Open"
          value={openCount}
          trend={openCount > 0 ? "Needs action" : "Clear"}
          trendTone={openCount > 0 ? "warning" : "success"}
          icon={<SparkleIcon size={14} />}
        />
        <KpiCard
          eyebrow="In progress"
          value={inProgressCount}
          icon={<MapPinIcon size={14} />}
        />
        <KpiCard
          eyebrow="Resolved"
          value={resolvedCount}
          trend={resolvedCount > 0 ? "Wins" : "—"}
          trendTone="success"
          icon={<HandshakeIcon size={14} />}
        />
      </div>

      {error && (
        <Card tone="blush" className="p-4">
          <p className="text-sm text-[color:var(--danger)]">
            Failed to load challenges: {error.message}
          </p>
        </Card>
      )}

      {(!rows || rows.length === 0) && (
        <EmptyState
          title="No challenges yet."
          description="When citizens report challenges, they'll appear here for institutions and industry to pick up."
        />
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <ChallengeCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </Container>
  );
}

function ChallengeCard({ row }: { row: ChallengeRow }) {
  const images = (row.issue_media ?? []).filter((m) => m.type === "image");
  const cover = images[0];
  const tone = STATUS_TONE[row.status] ?? "neutral";

  return (
    <Card interactive className="p-0 overflow-hidden flex flex-col group">
      <Link
        href={`/challenges/${row.id}`}
        className="flex flex-col h-full focus-visible:outline-none"
      >
        <div className="relative aspect-[16/10] bg-[color:var(--surface-inset)]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(cover.storage_path)}
              alt={row.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-2">
              <ImageIcon size={28} />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <Badge tone={tone}>{STATUS_LABEL[row.status] ?? row.status}</Badge>
            {images.length > 1 && (
              <Badge tone="neutral">+{images.length - 1} media</Badge>
            )}
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <Chip>{CATEGORY_LABEL[row.category] ?? row.category}</Chip>
          <h3 className="mt-3 text-base font-semibold tracking-tight leading-snug line-clamp-2">
            {row.title}
          </h3>
          {row.description && (
            <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-3">
              {row.description}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4 text-xs text-muted">
            {row.location_name && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon size={12} />
                {row.location_name}
              </span>
            )}
            <span className="tabular-nums">
              {row.support_count} supporters
            </span>
          </div>

          <div className="mt-auto pt-5 flex items-center justify-between">
            <span className="text-xs text-muted">View challenge</span>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[color:var(--foreground)] text-[color:var(--background)] group-hover:translate-x-0.5 transition-transform">
              <ArrowRightIcon size={14} />
            </span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
