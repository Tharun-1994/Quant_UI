// LRA Pairs reference configuration matching the Python LRA baseline.
// Consumed by utils/lraHelpers.ts:getLraDefaultsForRegime to populate the
// 7 LRA fields on a regime via the "Load LRA defaults" button.

const CLASSIFICATION = {
  SPY: { risk: "Risk On",  range_tier: "green",  min_daily_range_pct: 1.0 },
  EEM: { risk: "Risk On",  range_tier: "green",  min_daily_range_pct: 1.0 },
  EFA: { risk: "Risk On",  range_tier: "green",  min_daily_range_pct: 1.0 },
  IWM: { risk: "Risk On",  range_tier: "green",  min_daily_range_pct: 1.0 },
  QQQ: { risk: "Risk On",  range_tier: "green",  min_daily_range_pct: 1.0 },
  VNQ: { risk: "Risk On",  range_tier: "green",  min_daily_range_pct: 1.0 },
  LQD: { risk: "Risk On",  range_tier: "white",  min_daily_range_pct: 0.375 },
  GLD: { risk: "Risk Off", range_tier: "green",  min_daily_range_pct: 1.0 },
  TLT: { risk: "Risk Off", range_tier: "orange", min_daily_range_pct: 0.75 },
  CHFAUD: { risk: "Risk Off", range_tier: "orange", min_daily_range_pct: 0.75 },
  AGG: { risk: "Risk Off", range_tier: "white",  min_daily_range_pct: 0.375 },
  IEF: { risk: "Risk Off", range_tier: "white",  min_daily_range_pct: 0.375 },
  UUP: { risk: "Risk Off", range_tier: "white",  min_daily_range_pct: 0.375 },
  RINF: { risk: "Risk Off", range_tier: "white", min_daily_range_pct: 0.375 },
};

const SIZING = {
  mode: "fixed_dollar_per_leg",
  params: {
    conditional_on: "vix_close",
    conditional_on_lookback: 0,
    bands: [
      { max: 22.5, cap_a: 93750,  cap_b: 112500 },
      { max: null, cap_a: 127500, cap_b: 153750 },
    ],
    overrides: [
      { long_risk: "Risk On", short_risk: "Risk Off", long_cap: "cap_b", short_cap: "cap_a" },
    ],
    leg_capital_assignment: { strategy: "by_pair_attribute_combo" },
  },
};

const BULL = {
  pairing_entry_rules: {
    disallowed_combos: [{ long_risk: "Risk Off", short_risk: "Risk On" }],
    backtracking: {
      swap_target:  "short_leg",
      pool:         "pre_reduction_top",
      exclude_risk: "Risk On",
      selection:    "last",
    },
  },
  pair_exit_policy: {
    max_hold_sessions: 2,
    force_close: { method: "per_position" },
    profit_exit: { enabled: true, threshold: 0, pnl_method: "signed" },
  },
  entry_rules_tree_long: {
    type: "group", logic: "AND", children: [
      { indicator: "ibs", operator: "top_n_universe", params: { N: 2, direction: "asc" } },
      { indicator: "daily_range_pct", lookback: 0, operator: ">=", value_indicator: "min_daily_range_pct" },
      { type: "group", logic: "OR", children: [
        { indicator: "rsi", lookback: 5, operator: "<",  value: 50 },
        { indicator: "rsi", lookback: 5, operator: ">=", value: 80 },
        { indicator: "rsi", lookback: 2, operator: ">=", value: 90 },
      ]},
    ],
  },
  entry_rules_tree_short: {
    type: "group", logic: "AND", children: [
      { indicator: "ibs", operator: "top_n_universe", params: { N: 2, direction: "desc" } },
      { indicator: "daily_range_pct", lookback: 0, operator: ">=", value_indicator: "min_daily_range_pct" },
      { indicator: "rsi", lookback: 2, operator: ">", value: 50 },
    ],
  },
};

const BEAR = {
  pairing_entry_rules: {
    disallowed_combos: [{ long_risk: "Risk Off", short_risk: "Risk Off" }],
    backtracking: {
      swap_target:  "long_leg",
      pool:         "pre_reduction_bottom",
      exclude_risk: "Risk Off",
      selection:    "last",
    },
  },
  pair_exit_policy: {
    max_hold_sessions: 2,
    force_close: { method: "per_position" },
    profit_exit: { enabled: false },
  },
  // Bear drops the RSI carve-outs from both legs
  entry_rules_tree_long: {
    type: "group", logic: "AND", children: [
      { indicator: "ibs", operator: "top_n_universe", params: { N: 2, direction: "asc" } },
      { indicator: "daily_range_pct", lookback: 0, operator: ">=", value_indicator: "min_daily_range_pct" },
    ],
  },
  entry_rules_tree_short: {
    type: "group", logic: "AND", children: [
      { indicator: "ibs", operator: "top_n_universe", params: { N: 2, direction: "desc" } },
      { indicator: "daily_range_pct", lookback: 0, operator: ">=", value_indicator: "min_daily_range_pct" },
    ],
  },
};

export const LRA_DEFAULT_CONFIG = {
  ticker_classification: CLASSIFICATION,
  sizing_policy: SIZING,
  bull: BULL,
  bear: BEAR,
};