/**
 * Small Raah wordmark artifact used in nav and auth surfaces.
 * Two concentric arcs meeting the letter R — a subtle "pathway" mark.
 */
export function RaahMark({
  size = 24,
  tone = "accent",
}: {
  size?: number;
  tone?: "accent" | "accent2" | "foreground";
}) {
  const color =
    tone === "accent2"
      ? "var(--accent-2)"
      : tone === "foreground"
        ? "var(--foreground)"
        : "var(--accent)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="inline-block"
    >
      <path
        d="M4 20 A 10 10 0 0 1 20 12"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4 20 A 14 14 0 0 1 20 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="20" cy="6" r="1.6" fill={color} />
    </svg>
  );
}

/** Concentric arcs used as a large background artifact on hero-style panels. */
export function ArcArtifact({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      {[40, 80, 130, 190, 260, 340].map((r, i) => (
        <circle
          key={r}
          cx="200"
          cy="380"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity={0.15 + i * 0.05}
        />
      ))}
      <circle cx="200" cy="380" r="4" fill="currentColor" />
    </svg>
  );
}

/** Hairline grid + a single traced pathway. Used on auth and hero surfaces. */
export function PathwayArtifact({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <defs>
        <pattern id="raah-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="600" height="600" fill="url(#raah-grid)" />
      <path
        d="M40 520 C 140 460, 200 380, 260 340 S 420 260, 520 120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="40" cy="520" r="4" fill="currentColor" opacity="0.7" />
      <circle cx="260" cy="340" r="4" fill="currentColor" opacity="0.7" />
      <circle cx="520" cy="120" r="4" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
