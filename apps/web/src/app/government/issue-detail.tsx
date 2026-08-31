import Link from "next/link";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  KpiCard,
  StatusPill,
} from "@/components/ui";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  MapPinIcon,
} from "@/components/icons";
import type { IssueWithMedia } from "./types";
import { CATEGORY_LABEL, STATUS_COLOR, STATUS_LABEL } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function mediaUrl(storagePath: string): string {
  if (storagePath.startsWith("http")) return storagePath;
  return `${SUPABASE_URL}/storage/v1/object/public/issue-media/${storagePath}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IssueDetail({
  issue,
  backHref,
  backLabel,
}: {
  issue: IssueWithMedia;
  backHref: string;
  backLabel: string;
}) {
  const images = (issue.issue_media ?? []).filter((m) => m.type === "image");
  const statusColor =
    STATUS_COLOR[issue.status as keyof typeof STATUS_COLOR] ?? "#94a3b8";

  return (
    <div className="mx-auto max-w-5xl px-6 md:px-10 py-8 md:py-12 space-y-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
      >
        <ChevronLeftIcon size={14} />
        {backLabel}
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-medium border"
              style={{
                borderColor: statusColor,
                color: statusColor,
                background: `${statusColor}18`,
              }}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: statusColor }}
              />
              {STATUS_LABEL[issue.status as keyof typeof STATUS_LABEL]}
            </span>
            <Chip>
              {CATEGORY_LABEL[
                issue.category as keyof typeof CATEGORY_LABEL
              ] ?? issue.category}
            </Chip>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
            {issue.title}
          </h1>
          {issue.location_name && (
            <p className="mt-3 text-sm text-muted flex items-center gap-2">
              <MapPinIcon size={14} />
              {issue.location_name}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard eyebrow="Supporters" value={issue.support_count} />
        <KpiCard eyebrow="Views" value={issue.view_count} />
        <KpiCard
          eyebrow="Reported"
          value={new Date(issue.created_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        />
        <KpiCard eyebrow="Media" value={images.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {images.length > 0 ? (
            <Card className="p-4">
              <p className="eyebrow mb-3">Uploaded media</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {images.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={mediaUrl(m.storage_path)}
                    alt={m.original_name ?? issue.title}
                    className="w-full h-56 object-cover rounded-xl border border-[color:var(--border)]"
                    loading="lazy"
                  />
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No media uploaded for this issue yet."
              description="Citizens attach photos when reporting. This one has none."
            />
          )}

          {issue.description && (
            <Card className="p-6">
              <p className="eyebrow mb-3">Description</p>
              <p className="text-sm leading-relaxed text-foreground">
                {issue.description}
              </p>
            </Card>
          )}

          <Card className="p-6">
            <p className="eyebrow mb-3">Timeline</p>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <dt className="text-muted-2 text-[10px] uppercase tracking-widest">
                Reported at
              </dt>
              <dd>{formatDate(issue.created_at)}</dd>
              <dt className="text-muted-2 text-[10px] uppercase tracking-widest">
                Last updated
              </dt>
              <dd>{formatDate(issue.updated_at)}</dd>
            </dl>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <p className="eyebrow mb-3">Location</p>
            {issue.location_name && (
              <p className="text-sm font-medium">{issue.location_name}</p>
            )}
            <p className="mt-1 text-xs text-muted-2 font-mono">
              {issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}
            </p>
            <Link
              href={`https://www.openstreetmap.org/?mlat=${issue.latitude}&mlon=${issue.longitude}#map=16/${issue.latitude}/${issue.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-foreground underline underline-offset-4"
            >
              Open in map
              <ArrowRightIcon size={12} />
            </Link>
          </Card>

          <Card className="p-5">
            <p className="eyebrow mb-3">Status</p>
            <StatusPill status={issue.status} />
          </Card>

          <Card className="p-5">
            <p className="eyebrow mb-3">Issue ID</p>
            <p className="text-xs text-muted-2 font-mono break-all">
              {issue.id}
            </p>
          </Card>

          <Card tone="warm" className="p-5">
            <p className="eyebrow mb-2">Manage from map</p>
            <p className="text-xs text-muted">
              To advance the status (and upload evidence images), open this
              issue from the government dashboard map.
            </p>
            <Link
              href="/government"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground underline underline-offset-4"
            >
              Open dashboard
              <ArrowRightIcon size={12} />
            </Link>
          </Card>
        </aside>
      </div>

      {images.length === 0 && (
        <Badge tone="neutral">No supporting media on this issue yet.</Badge>
      )}
    </div>
  );
}
