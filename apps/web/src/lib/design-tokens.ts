/**
 * Shared Raah design tokens.
 *
 * Kept as plain values so the Expo mobile app can import them without
 * touching CSS. If you change the palette here, mirror it in
 * `src/app/globals.css`.
 */
export const colors = {
  background: "#faf6ee",
  surface: "#f3ecdd",
  surface2: "#eaf0e2",
  surface3: "#f5e6de",
  foreground: "#241f18",
  muted: "#6c6151",
  muted2: "#9a8f7a",
  border: "#e2d8c3",
  borderStrong: "#c7bca4",
  accent: "#b46a4a",
  accentHover: "#9c5a3d",
  accentSoft: "#f5e2d5",
  accent2: "#6f8a68",
  accent2Soft: "#dfe7d6",
  success: "#4f7a4a",
  warning: "#9a6b1f",
  danger: "#9d4034",
} as const;

export const radius = {
  none: 0,
  sm: 2,
  md: 4,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
