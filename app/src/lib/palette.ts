/**
 * Chart colours for the dark theme.
 * Orange is the focal accent - use it only for the repeat / 2+ Rents series.
 * "ink" is the warm off-white used for neutral series and axis text.
 */
export const COLORS = {
  brand: "#ff5f00",
  ink: "#e7ded2",
  mutedInk: "rgba(244,239,233,0.55)",
  grid: "rgba(255,255,255,0.08)",
  faint: "rgba(255,255,255,0.16)",
} as const;

export const AXIS_TICK = { fontSize: 11, fill: COLORS.mutedInk } as const;
