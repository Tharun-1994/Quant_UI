// Universes
export const UNIVERSES: Record<string, string> = {
  sp500: "S&P 500",
  russell3000: "Russell 3000",
  liquid500: "Liquid 500",
};
export const UNIVERSES_CODES: Record<string, string> = {
  "S&P 500": "sp500",
  "Russell 3000": "russell3000",
  "Liquid 500": "liquid500",
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
};

// Order Types
export const ORDER_TYPE: Record<string, string> = {
  normal: "NORMAL",
  limit: "LIMIT",
  limit_atr: "LIMIT_ATR",
};

// Stoploss Type
export const STOPLOSS_TYPE: Record<string, string> = {
  nrml: "NORMAL",
  atr_based: "ATR_BASED",
  dollar_based: "DOLLAR_BASED",
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