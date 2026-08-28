/* ------------------------------------------------------------------ */
/* Government dashboard — shared types                                 */
/* ------------------------------------------------------------------ */

export type IssueStatus =
  | "reported"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "closed";

export type IssueCategory =
  | "roads"
  | "water"
  | "sanitation"
  | "electricity"
  | "street_lighting"
  | "drainage"
  | "public_safety"
  | "environment"
  | "public_property"
  | "other";

export type IssueMedia = {
  id: string;
  issue_id: string;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  type: "image" | "video";
  size_bytes: number | null;
  created_at: string;
};

export type Issue = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: IssueCategory;
  status: IssueStatus;
  location_name: string | null;
  latitude: number;
  longitude: number;
  support_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type IssueWithMedia = Issue & {
  issue_media: IssueMedia[];
};

/* ------------------------------------------------------------------ */
/* Status → color map                                                  */
/* ------------------------------------------------------------------ */

export const STATUS_COLOR: Record<IssueStatus, string> = {
  reported: "#ef4444",
  acknowledged: "#f59e0b",
  in_progress: "#eab308",
  resolved: "#22c55e",
  rejected: "#6b7280",
  closed: "#374151",
};

export const STATUS_LABEL: Record<IssueStatus, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};

export const CATEGORY_LABEL: Record<IssueCategory, string> = {
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
