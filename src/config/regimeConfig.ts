/**
 * regimeConfig.ts
 * ===============
 * Single source of truth for what each regime type supports.
 *
 * INDICATOR LISTS REMOVED — they now come from the API.
 * Use useIndicatorRegistry().indicatorsFor(regime_type, section, side) instead.
 *
 *   section → "entry" | "exit" | "market_regime" | "volatility"
 *   side    → "lhs" (indicator dropdown) | "rhs" (compare-to dropdown)
 *
 * Mapping from old config.indicators.* to new hook calls:
 *   config.indicators.entry          → indicatorsFor(regime_type, "entry",         "lhs")
 *   config.indicators.valueIndicators→ indicatorsFor(regime_type, "entry",         "rhs")
 *   config.indicators.marketTrend    → indicatorsFor(regime_type, "market_regime", "lhs")
 *   config.indicators.freeze         → indicatorsFor(regime_type, "volatility",    "lhs")
 *
 * Feature flags stay here — they are UI decisions, not indicator data.
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

// ─── Full config for a regime type ──────────────────────────────

export interface RegimeTypeConfig {
  key: string;
  label: string;
  features: RegimeFeatures;
}

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
  },

  Normal: {
    key: "normal",
    label: "Normal",
    features: {
      lookInsideBar: false,
      intradayTiming: true,
      ranking: true,
      volatilityRules: false,
      marketTrendRules: false,
      multipleRegimes: false,
      etfSelector: false,
      universeSelector: true,
    },
  },

  Simple: {
    key: "simple",
    label: "Simple",
    features: {
      lookInsideBar: false,
      intradayTiming: true,
      ranking: true,
      volatilityRules: false,
      marketTrendRules: true,
      multipleRegimes: true,
      etfSelector: false,
      universeSelector: true,
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
  },
};

// ─── Fallback config ─────────────────────────────────────────────

const DEFAULT_CONFIG: RegimeTypeConfig = REGIME_CONFIGS["Normal"];

// ─── Public API ─────────────────────────────────────────────────

export function getRegimeConfig(regimeType: string): RegimeTypeConfig {
  return REGIME_CONFIGS[regimeType] ?? DEFAULT_CONFIG;
}

export function isETFRegime(regimeType: string): boolean {
  return REGIME_CONFIGS[regimeType]?.features.etfSelector ?? false;
}

export function getRegimeTypeOptions(): { key: string; label: string }[] {
  return Object.values(REGIME_CONFIGS).map((c) => ({
    key: c.label,
    label: c.label,
  }));
}