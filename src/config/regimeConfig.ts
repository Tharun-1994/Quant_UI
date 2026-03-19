/**
 * regimeConfig.ts
 * ===============
 * Single source of truth for what each regime type supports.
 *
 * When you need to add a new indicator, feature, or field for ETF vs Equity,
 * add it HERE — not scattered across components with conditionals.
 *
 * Usage in components:
 *   import { getRegimeConfig } from "../constants/regimeConfig";
 *   const config = getRegimeConfig(regime.regime_type);
 *   if (config.features.lookInsideBar) { ... }
 *   config.indicators.entry  → filtered indicator list for dropdowns
 */

// ─── Feature flags per regime type ────────────────────────────────

export interface RegimeFeatures {
  /** Show "Look Inside Bar" checkbox (minute-bar SL/TP scanning) */
  lookInsideBar: boolean;

  /** Allow INTRADAY option in SL/TP timing dropdowns */
  intradayTiming: boolean;

  /** Show ranking section (indicator, lookback, order) */
  ranking: boolean;

  /** Show volatility rules section */
  volatilityRules: boolean;

  /** Show market trend rules section */
  marketTrendRules: boolean;

  /** Allow adding multiple regimes */
  multipleRegimes: boolean;

  /** Show ETF ticker selector */
  etfSelector: boolean;

  /** Show universe selector (sp500, r3000 etc) */
  universeSelector: boolean;
}

// ─── Indicator sets per regime type ──────────────────────────────

export interface RegimeIndicators {
  /** Indicators available in entry/exit rule dropdowns */
  entry: Record<string, string>;

  /** Indicators available in market trend rule dropdowns */
  marketTrend: Record<string, string>;

  /** Indicators available as value-side comparisons */
  valueIndicators: Record<string, string>;

  /** Indicators available in freeze/resume/volatility cut rules */
  freeze: Record<string, string>;
}

// ─── Full config for a regime type ──────────────────────────────

export interface RegimeTypeConfig {
  key: string;
  label: string;
  features: RegimeFeatures;
  indicators: RegimeIndicators;
}

// ─── Indicator definitions ──────────────────────────────────────

/** Indicators applicable to equity strategies (sp500, r3000, liquid500) */
const EQUITY_ENTRY_INDICATORS: Record<string, string> = {
  rsi: "RSI",
  adx: "ADX",
  sma: "SMA",
  hv: "Historical Volatility",
  atr: "Avg True Range",
  crsi: "CRSI",
  unadjusted_close: "Unadjusted Close Price",
  relative_momentum: "Relative Momentum",
  average_volume: "Average Volume",
  close: "Close Price",
  n_week_high_recent: "N-Week High occurred within last X days",
  vix_close: "VIX Close Price",
};

/** Indicators applicable to individual ETF strategies (SPY, GLD, etc.) */
const ETF_ENTRY_INDICATORS: Record<string, string> = {
  sma: "SMA",
  atr: "Avg True Range",
  close: "Close Price",
  range_close: "Range Close",
  rsi: "RSI",
};

/** Market trend indicators (used for regime splitting) */
const MARKET_TREND_INDICATORS: Record<string, string> = {
  close: "Close Price",
  sma: "SMA",
  atr: "Avg True Range",
  range_close: "Range Close",
};

/** Value-side indicators (RHS of comparisons like "close > sma_200") */
const EQUITY_VALUE_INDICATORS: Record<string, string> = {
  sma: "SMA",
  close: "Close Price",
  vix_close: "VIX Close Price",
};

const ETF_VALUE_INDICATORS: Record<string, string> = {
  sma: "SMA",
  close: "Close Price",
  range_close: "Range Close",
  atr: "Avg True Range",
};

/** Freeze/Resume/Volatility cut indicators — ETF strategies */
const ETF_FREEZE_INDICATORS: Record<string, string> = {
  atr: "Avg True Range",
  close: "Close Price",
  sma: "SMA",
  range_close: "Range Close",
  rsi: "RSI",
};

/** Freeze/Resume/Volatility cut indicators — Equity strategies */
const EQUITY_FREEZE_INDICATORS: Record<string, string> = {
  atr: "Avg True Range",
  vix_close: "VIX Close Price",
  adx: "ADX",
  close: "Close Price",
  sma: "SMA",

};

// ─── Regime type configs ────────────────────────────────────────

const REGIME_CONFIGS: Record<string, RegimeTypeConfig> = {
  "Individual ETFs - Simple": {
    key: "individual_etfs_simple",
    label: "Individual ETFs - Simple",
    features: {
      lookInsideBar: true,
      intradayTiming: true,
      ranking: false,
      volatilityRules: false,
      marketTrendRules: true,
      multipleRegimes: true,
      etfSelector: true,
      universeSelector: false,
    },
    indicators: {
      entry: ETF_ENTRY_INDICATORS,
      marketTrend: MARKET_TREND_INDICATORS,
      valueIndicators: ETF_VALUE_INDICATORS,
      freeze: ETF_FREEZE_INDICATORS,
    },
  },

  Normal: {
    key: "normal",
    label: "Normal",
    features: {
      lookInsideBar: false,
      intradayTiming: false,
      ranking: true,
      volatilityRules: false,
      marketTrendRules: false,
      multipleRegimes: false,
      etfSelector: false,
      universeSelector: true,
    },
    indicators: {
      entry: EQUITY_ENTRY_INDICATORS,
      marketTrend: MARKET_TREND_INDICATORS,
      valueIndicators: EQUITY_VALUE_INDICATORS,
      freeze: EQUITY_FREEZE_INDICATORS,
    },
  },

  Simple: {
    key: "simple",
    label: "Simple",
    features: {
      lookInsideBar: false,
      intradayTiming: false,
      ranking: true,
      volatilityRules: false,
      marketTrendRules: true,
      multipleRegimes: true,
      etfSelector: false,
      universeSelector: true,
    },
    indicators: {
      entry: EQUITY_ENTRY_INDICATORS,
      marketTrend: MARKET_TREND_INDICATORS,
      valueIndicators: EQUITY_VALUE_INDICATORS,
      freeze: EQUITY_FREEZE_INDICATORS,
    },
  },

  Complex: {
    key: "complex",
    label: "Complex",
    features: {
      lookInsideBar: false,
      intradayTiming: false,
      ranking: true,
      volatilityRules: true,
      marketTrendRules: true,
      multipleRegimes: false,
      etfSelector: false,
      universeSelector: true,
    },
    indicators: {
      entry: EQUITY_ENTRY_INDICATORS,
      marketTrend: MARKET_TREND_INDICATORS,
      valueIndicators: EQUITY_VALUE_INDICATORS,
      freeze: EQUITY_FREEZE_INDICATORS,
    },
  },
};

// ─── Fallback config (safe default) ─────────────────────────────

const DEFAULT_CONFIG: RegimeTypeConfig = REGIME_CONFIGS["Normal"];

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get the full configuration for a regime type.
 *
 * @param regimeType - e.g. "Individual ETFs - Simple", "Normal", "Simple", "Complex"
 * @returns The config object with features and indicators
 *
 * @example
 *   const config = getRegimeConfig(regime.regime_type);
 *   if (config.features.lookInsideBar) { ... }
 *   <select>{Object.entries(config.indicators.entry).map(...)}</select>
 */
export function getRegimeConfig(regimeType: string): RegimeTypeConfig {
  return REGIME_CONFIGS[regimeType] ?? DEFAULT_CONFIG;
}

/**
 * Check if a regime type is ETF-based.
 */
export function isETFRegime(regimeType: string): boolean {
  return REGIME_CONFIGS[regimeType]?.features.etfSelector ?? false;
}

/**
 * Get all available regime type options for dropdowns.
 */
export function getRegimeTypeOptions(): { key: string; label: string }[] {
  return Object.values(REGIME_CONFIGS).map((c) => ({
    key: c.label,
    label: c.label,
  }));
}