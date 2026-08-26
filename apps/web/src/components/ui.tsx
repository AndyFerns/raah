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

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const baseButton =
  "inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background border-foreground hover:bg-neutral-800",
  secondary:
    "bg-background text-foreground border-border-strong hover:bg-surface",
  ghost: "bg-transparent text-foreground border-transparent hover:bg-surface",
  danger:
    "bg-background text-[color:var(--danger)] border-[color:var(--danger)] hover:bg-red-50",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`${baseButton} ${buttonVariants[variant]} ${className}`}
    />
  );
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  href: string;
};

export function LinkButton({
  variant = "primary",
  className = "",
  href,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      {...rest}
      className={`${baseButton} ${buttonVariants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Label({ className = "", ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...rest}
      className={`block text-xs uppercase tracking-widest text-muted mb-2 ${className}`}
    />
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full h-10 px-3 border border-border bg-background text-foreground text-sm focus:border-foreground focus:outline-none ${className}`}
    />
  );
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`w-full min-h-24 p-3 border border-border bg-background text-foreground text-sm focus:border-foreground focus:outline-none ${className}`}
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
      className={`w-full h-10 px-2 border border-border bg-background text-foreground text-sm focus:border-foreground focus:outline-none ${className}`}
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
      {hint && !error && (
        <p className="mt-1 text-xs text-muted-2">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-[color:var(--danger)]">{error}</p>}
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
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base text-muted leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export function StatusPill({
  status,
}: {
  status:
    | "pending"
    | "under_review"
    | "verified"
    | "rejected"
    | "suspended"
    | "sent"
    | "expired"
    | "revoked";
}) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "border-border text-muted",
    },
    under_review: {
      label: "Under Review",
      className: "border-[color:var(--warning)] text-[color:var(--warning)]",
    },
    verified: {
      label: "Verified",
      className: "border-[color:var(--success)] text-[color:var(--success)]",
    },
    rejected: {
      label: "Rejected",
      className: "border-[color:var(--danger)] text-[color:var(--danger)]",
    },
    suspended: {
      label: "Suspended",
      className: "border-[color:var(--danger)] text-[color:var(--danger)]",
    },
    sent: {
      label: "Sent",
      className: "border-border-strong text-foreground",
    },
    expired: {
      label: "Expired",
      className: "border-border text-muted",
    },
    revoked: {
      label: "Revoked",
      className: "border-border text-muted",
    },
  };
  const item = map[status] ?? { label: status, className: "border-border text-muted" };
  return (
    <span
      className={`inline-flex items-center h-6 px-2 text-[11px] uppercase tracking-wider border ${item.className}`}
    >
      {item.label}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-background ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border border-dashed border-border p-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted">{description}</p>
      )}
    </div>
  );
}
