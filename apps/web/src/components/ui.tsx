import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "accent2"
  | "dark";
type ButtonSize = "sm" | "md" | "lg";

const baseButton =
  "inline-flex items-center justify-center gap-2 font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full whitespace-nowrap";

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-[color:var(--accent)] text-white border-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-[color:var(--surface)] text-[color:var(--foreground)] border-[color:var(--border-strong)] hover:bg-[color:var(--surface-2)]",
  ghost:
    "bg-transparent text-[color:var(--foreground)] border-transparent hover:bg-[color:var(--surface-2)]",
  danger:
    "bg-[color:var(--surface)] text-[color:var(--danger)] border-[color:var(--danger)] hover:bg-[color:var(--danger-soft)]",
  accent2:
    "bg-[color:var(--accent-2)] text-white border-[color:var(--accent-2)] hover:opacity-90 shadow-[var(--shadow-sm)]",
  dark: "bg-[color:var(--foreground)] text-[color:var(--background)] border-[color:var(--foreground)] hover:opacity-90 shadow-[var(--shadow-sm)]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`${baseButton} ${sizeClass[size]} ${buttonVariants[variant]} ${className}`}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href: string;
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  href,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      {...rest}
      className={`${baseButton} ${sizeClass[size]} ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function IconButton({
  ariaLabel,
  variant = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  ariaLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-10 w-10";
  return (
    <button
      {...rest}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center border transition-all rounded-full disabled:opacity-50 ${dim} ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Label({
  className = "",
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...rest}
      className={`block text-xs uppercase tracking-widest text-muted mb-2 ${className}`}
    />
  );
}

const inputBase =
  "w-full h-11 px-4 border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] text-sm rounded-xl focus:border-[color:var(--accent)] focus:outline-none placeholder:text-[color:var(--muted-2)]";

export function Input({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${inputBase} ${className}`} />;
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`w-full min-h-28 p-4 border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] text-sm rounded-xl focus:border-[color:var(--accent)] focus:outline-none placeholder:text-[color:var(--muted-2)] ${className}`}
    />
  );
}

export function Select({
  className = "",
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`w-full h-11 px-3 border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] text-sm rounded-xl focus:border-[color:var(--accent)] focus:outline-none ${className}`}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted-2">{hint}</p>}
      {error && (
        <p className="mt-1.5 text-xs text-[color:var(--danger)]">{error}</p>
      )}
    </div>
  );
}

export function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`w-full max-w-6xl mx-auto px-6 md:px-10 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type StatusKind =
  | "pending"
  | "under_review"
  | "verified"
  | "rejected"
  | "suspended"
  | "sent"
  | "expired"
  | "revoked"
  | "accepted"
  | "withdrawn"
  | "completed";

const statusMap: Record<StatusKind, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "neutral" },
  under_review: { label: "Under Review", tone: "warning" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
  sent: { label: "Sent", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "neutral" },
  accepted: { label: "Accepted", tone: "success" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  completed: { label: "Completed", tone: "success" },
};

export function StatusPill({ status }: { status: StatusKind | string }) {
  const item = statusMap[status as StatusKind] ?? {
    label: String(status).replace(/_/g, " "),
    tone: "neutral" as BadgeTone,
  };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

const badgeTone: Record<BadgeTone, string> = {
  neutral:
    "bg-[color:var(--surface-2)] text-[color:var(--muted)] border-[color:var(--border)]",
  success:
    "bg-[color:var(--success-soft)] text-[color:var(--success)] border-transparent",
  warning:
    "bg-[color:var(--warning-soft)] text-[color:var(--warning)] border-transparent",
  danger:
    "bg-[color:var(--danger-soft)] text-[color:var(--danger)] border-transparent",
  info: "bg-[color:var(--info-soft)] text-[color:var(--info)] border-transparent",
  accent:
    "bg-[color:var(--accent-soft)] text-[color:var(--accent)] border-transparent",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-medium border ${badgeTone[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
  tone,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  tone?: "warm" | "sage" | "blush" | "default" | "inset";
  interactive?: boolean;
}) {
  const toneClass =
    tone === "warm"
      ? "bg-[color:var(--surface-2)]"
      : tone === "sage"
        ? "bg-[color:var(--accent-2-soft)]"
        : tone === "blush"
          ? "bg-[color:var(--accent-soft)]"
          : tone === "inset"
            ? "bg-[color:var(--surface-inset)]"
            : "bg-[color:var(--surface)]";
  const hoverClass = interactive
    ? "hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all"
    : "";
  return (
    <div
      className={`border border-[color:var(--border)] rounded-2xl shadow-[var(--shadow-sm)] ${toneClass} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-2)] p-10 text-center rounded-2xl">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-muted max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function KpiCard({
  eyebrow,
  value,
  trend,
  trendTone = "neutral",
  hint,
  icon,
}: {
  eyebrow: string;
  value: string | number;
  trend?: string;
  trendTone?: BadgeTone;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-[color:var(--surface)] border border-[color:var(--border)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 text-xs text-muted">
        {icon}
        <span className="uppercase tracking-widest">{eyebrow}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <p className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {trend && <Badge tone={trendTone}>{trend}</Badge>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-2">{hint}</p>}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "accent",
}: {
  value: number;
  tone?: "accent" | "accent2";
}) {
  const bg =
    tone === "accent2" ? "bg-[color:var(--accent-2)]" : "bg-[color:var(--accent)]";
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="w-full h-1.5 rounded-full bg-[color:var(--surface-inset)] overflow-hidden"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full ${bg} rounded-full transition-all`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Chip({
  children,
  tone,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center h-7 px-3 rounded-full text-xs border ${tone ? badgeTone[tone] : "bg-[color:var(--surface-2)] text-[color:var(--foreground)] border-[color:var(--border)]"} ${className}`}
    >
      {children}
    </span>
  );
}
