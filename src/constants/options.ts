// Universes
export const UNIVERSES: Record<string, string> = {
  sp500: "S&P 500",
  russell3000: "Russell 3000",
  liquid500: "Liquid 500",
  sp100: "S&P 100",
  nasdaq100: "Nasdaq 100",
  lra14: "LRA 14",                    // LRA Patch 37
};
export const UNIVERSES_CODES: Record<string, string> = {
  "S&P 500": "sp500",
  "Russell 3000": "russell3000",
  "Liquid 500": "liquid500",
  "S&P 100": "sp100",
  "Nasdaq 100": "nasdaq100",
  "LRA 14": "lra14",                  // LRA Patch 37
};

export const INDIVIDUAL_ETFS = [
  { key: "SPY", label: "SPY" },
  { key: "GLD", label: "Gold (GLD)" },
];

// Operators
export const OPERATORS: Record<string, string> = {
  "<": "<",
  "<=": "<=",
  ">": ">",
  ">=": ">=",
  "==": "==",
  IS_TRUE: "is true",
  month_in: "month in (e.g. 5,6)",
};

// Connectors
export const CONNECTORS: Record<string, string> = {
  "&&": "AND",
  "||": "OR",
};

// Rebalance
export const REBALANCE: Record<string, string> = {
  daily: "DAILY",
  weekly: "WEEKLY",
  monthly: "MONTHLY",
};

// Signal Timing
export const SIGNAL_TIMING: Record<string, string> = {
  open: "Next bar Open",
  close: "This Bar Close",
  eod_close: "EOD Close",
};

// Risk Timing
export const RISK_TIMING: Record<string, string> = {
  eod: "EOD",
  intraday: "INTRADAY",
};

// Ranking Orders
export const RANKING_ORDERS: Record<string, string> = {
  asc: "Ascending",
  desc: "Descending",
};

// System Types
export const SYSTEM_TYPE: Record<string, string> = {
  long: "LONG",
  short: "SHORT",
  long_short: "LONGSHORT",    
};

// Order Types
export const ORDER_TYPE: Record<string, string> = {
  normal: "NORMAL",
  limit: "LIMIT",
  limit_atr: "LIMIT_ATR",
};

// Stoploss Type
// Patch 61: PORTFOLIO added. STOPLOSS_TYPE_REGIME_GATING below is the
// single source of truth for which types are valid per regime_type.
// Adding a new type requires updating BOTH constants here and the helper.
// Mirror in Python static_config.py (Patch 60) + Java StaticConfig.java (Patch 62).
export const STOPLOSS_TYPE: Record<string, string> = {
  nrml: "NORMAL",
  atr_based: "ATR_BASED",
  dollar_based: "DOLLAR_BASED",
  portfolio: "PORTFOLIO",
};

// Patch 61: stoploss-type → allowed regime types (ONE PLACE update).
// ETF regimes accept only DOLLAR_BASED; non-ETF accept NORMAL/ATR/PORTFOLIO.
export const STOPLOSS_TYPE_REGIME_GATING: Record<string, string[]> = {
  NORMAL:       ["Normal", "Simple", "Complex"],
  ATR_BASED:    ["Normal", "Simple", "Complex"],
  PORTFOLIO:    ["Normal", "Simple", "Complex"],
  DOLLAR_BASED: ["Individual ETFs - Simple"],
};

// Patch 61: helper used by RegimeCard stoploss modal (Patch 67) to filter
// dropdown options. Returns empty list when regimeType is undefined.
export function allowedStoplossTypesForRegime(
  regimeType: string | undefined
): string[] {
  if (!regimeType) return [];
  return Object.entries(STOPLOSS_TYPE_REGIME_GATING)
    .filter(([_, regimes]) => regimes.includes(regimeType))
    .map(([type]) => type);
}

// Patch 72h: drawdown anchor mirror of Python static_config.PORTFOLIO_STOPLOSS_ANCHOR.
// PEAK  — drawdown from all-time peak equity (standard kill-switch)
// DAILY — single-day drop from previous close (circuit breaker)
export const PORTFOLIO_STOPLOSS_ANCHOR: Record<string, string> = {
  peak:  "PEAK",
  daily: "DAILY",
};

export const PORTFOLIO_STOPLOSS_ANCHOR_LABELS: Record<string, string> = {
  PEAK:  "Drawdown from peak (kill-switch)",
  DAILY: "Single-day drop (circuit breaker)",
};

export const PORTFOLIO_STOPLOSS_ANCHOR_DEFAULT = "PEAK";

// Volatility Safety Net Types
// Picked from the per-regime "Safety Net" card. Drives the engine behaviour.
//   none           — no safety net; strategy trades freely
//   simple         — stateless freeze/resume rule trees (current behaviour)
//   spy_volatility — stateful 4-escape state machine (Stage 3 — not yet wired)
export const SAFETY_NET_TYPES: Record<string, string> = {
  none: "None — no safety net",
  simple: "Simple — freeze & resume rule trees",
  spy_volatility: "SPY Volatility — stateful 4-escape model",
  spy_volatility_pause: "SPY Volatility Pause — relative-threshold gate (block entries only)",
};

// Takeprofit Type
export const TAKEPROFIT_TYPE: Record<string, string> = {
  nrml: "NORMAL",
  atr_based: "ATR_BASED",
  dollar_based: "DOLLAR_BASED",
};

// Market regime Type
export const MARKET_REGIME_TYPE: Record<string, string> = {
  individual_etfs_simple: "Individual ETFs - Simple",
  normal: "Normal",
  simple: "Simple",
  complex: "Complex",
};

export const INDEX_TICKERS: Record<string, string> = {
  spy: "SPY",
  qqq: "QQQ",
  vix: "VIX",
  gld: "GLD",
};

export const COMPARISON_TYPES: Record<string, string> = {
  value: "Value",
  indicator_price: "Indicator/ Price",
  top_n: "Top N (raw)",
  top_n_universe: "Top N (within active universe)",
};

export const INDICATOR_CONFIG: Record<
  string,
  { lookback?: number; disableLookback?: boolean }
> = {
  crsi: { lookback: 2 },
  unadjusted_close: { disableLookback: true },
  daily_close: { disableLookback: true },
  close_minus_open: { disableLookback: true },
};

// ── REMOVED ──────────────────────────────────────────────────────────────────
// INDICATORS and INDICATOR_META have been removed from this file.
// All indicator metadata now comes from the API via useIndicatorRegistry().
// See src/context/IndicatorRegistry.tsx.
// ─────────────────────────────────────────────────────────────────────────────

// ── LRA Pairs (LONGSHORT system_type) — Patch 38 ─────────────────────────────

// Risk classification per ticker
export const RISK_OPTIONS: Record<string, string> = {
  "Risk On": "Risk On",
  "Risk Off": "Risk Off",
};

// Range tier classification per ticker
export const RANGE_TIER_OPTIONS: Record<string, string> = {
  green: "Green",
  orange: "Orange",
  white: "White",
};

// Pair exit policy — force close method
export const FORCE_CLOSE_METHODS: Record<string, string> = {
  per_position: "Per Position",
  portfolio_shielded: "Portfolio Shielded",
};

// Pair exit policy — P&L computation method for profit_exit threshold
export const PNL_METHODS: Record<string, string> = {
  signed: "Signed (net pair P&L)",
  abs_per_leg: "Abs Per Leg",
};

// Sizing policy mode
export const SIZING_MODES: Record<string, string> = {
  capital_div_slots: "Capital / Slots",
  fixed_dollar_per_leg: "Fixed Dollar Per Leg",
};

// Sizing cap labels (used in policy override config)
export const SIZING_CAPS: Record<string, string> = {
  cap_a: "Cap A",
  cap_b: "Cap B",
};

// Pairing backtracking — which leg to swap when a disallowed combo is hit
export const SWAP_TARGETS: Record<string, string> = {
  short_leg: "Short Leg",
  long_leg: "Long Leg",
};

// Pairing backtracking — pool to draw replacement from
export const PAIRING_POOLS: Record<string, string> = {
  pre_reduction_top: "Pre-Reduction Top",
  pre_reduction_bottom: "Pre-Reduction Bottom",
};

// Pairing backtracking — selection strategy from filtered pool
export const PAIRING_SELECTIONS: Record<string, string> = {
  last: "Last",
  first: "First",
};

// Comparison operators allowed in LRA leg rule trees (subset of OPERATORS)
export const LRA_COMPARISON_OPERATORS: Record<string, string> = {
  ">": ">",
  "<": "<",
  ">=": ">=",
  "<=": "<=",
  "==": "==",
  "!=": "!=",
};