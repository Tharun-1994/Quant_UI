/**
 * uiConstants.ts
 * ==============
 * Shared UI display constants used across multiple components.
 *
 * Rules
 * -----
 * - Add/change labels or colours HERE only.
 * - Components import from here — never re-define locally.
 * - CATEGORY_COLOURS replaces the two diverging copies in
 *   AdminIndicators.tsx (CATEGORY_COLOURS) and IndicatorsPage.tsx (CAT_COLOUR).
 * - MONTH_LABELS, TDOM_LABELS, WD_LABELS move here from inline definitions
 *   inside RegimeCard.tsx.
 */

// ── Category badge colours ────────────────────────────────────────────────────
// Used in AdminIndicators and IndicatorsPage.
// Single source — change a colour here; both pages update automatically.
export const CATEGORY_COLOURS: Record<string, string> = {
  Momentum:        "bg-blue-50 text-blue-700",
  Trend:           "bg-green-50 text-green-700",
  Volatility:      "bg-orange-50 text-orange-700",
  Price:           "bg-purple-50 text-purple-700",
  Volume:          "bg-teal-50 text-teal-700",
  "Risk-adjusted": "bg-pink-50 text-pink-700",
};

// ── Calendar labels ───────────────────────────────────────────────────────────
// Used in the banned-months picker and TDOM filter editor in RegimeCard.
export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// Trading-day-of-month ordinal labels (0-based index).
// TDOM 0 = 1st trading day of the month, etc.
export const TDOM_LABELS = [
  "1st", "2nd", "3rd", "4th", "5th",
  "6th", "7th", "8th", "9th", "10th",
] as const;

// Weekday labels (0 = Monday … 6 = Sunday — matches Python's weekday()).
export const WD_LABELS = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
] as const;

// ── Strategy detail tab config ────────────────────────────────────────────────
// Used in StrategyDetail.tsx to render the tab bar.
// Add/rename/reorder tabs here only.
export interface TabConfig {
  key: string;
  label: string;
}

export const STRATEGY_TABS: TabConfig[] = [
  { key: "overview",      label: "Overview" },
  { key: "marketRegime",  label: "Market Regime" },
  { key: "equity",        label: "Equity" },
  { key: "performance",   label: "Performance" },
  { key: "download",      label: "Download" },
];