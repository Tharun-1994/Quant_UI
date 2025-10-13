// Universes
export const UNIVERSES: Record<string, string> = {
  sp500: "S&P 500",
  r3000: "Russell 3000",
  liquid500: "Liquid 500",
};
export const UNIVERSES_CODES: Record<string, string> = {
  "S&P 500": "sp500",
  "Russell 3000": "r3000",
  "Liquid 500": "liquid500",
};

// Indicators
export const INDICATORS: Record<string, string> = {
  rsi: "RSI",
  adx: "ADX",
  sma: "SMA",
  hv: "Historical Volatility",
  atr: "Avg True Range",
  crsi: "CRSI",
  unadjusted_close: "Unadjusted Close Price",
  relative_momentum: "Relative Momentum"
};

export const MARKET_INDICATORS: Record<string, string> = {
  close: "Close Price",
};

// Operators
export const OPERATORS: Record<string, string> = {
  "<": "<",
  "<=": "<=",
  ">": ">",
  ">=": ">=",
  "==": "==",
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
  open: "Next Day Morning",
  // close: "Today Close",
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
  // short: "SHORT"
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
};

// Takeprofit Type
export const TAKEPROFIT_TYPE: Record<string, string> = {
  nrml: "NORMAL",
  atr_based: "ATR_BASED",
};


// market regime Type
export const MARKET_REGIME_TYPE: Record<string, string> = {
  normal: "Normal",
  simple: "Simple",
  complex: "Complex",
};

export const INDEX_TICKERS: Record<string, string> = {
  spy: "SPY",
};

export const COMPARISON_TYPES: Record<string, string> = {
  value: "Value",
  indicator_price: "Indicator/ Price",

};

// constants/indicatorDefaults.ts
// constants/indicatorDefaults.ts
export const INDICATOR_CONFIG: Record<
  string,
  { lookback?: number; disableLookback?: boolean }
> = {
  crsi: { lookback: 2 },             // auto-sets to 2            // example default
  unadjusted_close: { disableLookback: true }, // disables lookback

};

