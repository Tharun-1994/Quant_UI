// src/model/Strategy.ts
export interface Rule {
  indicator: string;
  lookback: number;
  operator: string;
  value: number;
  connector: string;
  label?: string;
  value_type?: string;
  value_indicator: string;
  value_lookback: number;
  value_range_percent?: number;
  params?: Record<string, any>;
  regime_ticker?: string;  // ticker context for market trend rules (e.g. "SPY", "VIX")
  ranking_order?: string;  // for top_n: "Ascending" or "Descending"
}

export type Logic = "AND" | "OR";

export type RuleNode =
  | { type: "rule"; id: string; rule: Rule }
  | { type: "group"; id: string; logic: Logic; children: RuleNode[] };

export type RuleTree = Extract<RuleNode, { type: "group" }>;

/** One stateful safety-net policy attached to a regime.
 *
 *  `type` selects which engine-side policy class will consume this item.
 *  `params` is a free-form blob whose shape each policy validates on its own.
 *
 *  Example — simple freeze/resume:
 *    { type: "simple",
 *      params: {
 *        freeze_rules_tree: {...}, resume_rules_tree: {...},
 *        freeze_timing: "open",   resume_timing: "open"
 *      } }
 *
 *  Example — SPY volatility (Stage 3c):
 *    { type: "spy_volatility",
 *      params: {
 *        vol_ticker: "SPY", vol_lookback: 5, vol_threshold: 0.025,
 *        timeout_days: 20, selloff_pct: 0.20,
 *        peak_drop_pct: 0.80, rearm_pct: 0.80
 *      } }
 */
export interface SafetyNetItem {
  type: string;
  params: Record<string, any>;
}
// src/model/MarketRegime.ts
export interface MarketRegime {
  id?: number;
  strategy_id: number;

  regime_type: string;        // Normal | Simple | Complex
  regime_ticker: string;

  market_trend_type?: string;
  market_trend_rules? : Rule[];
  volatility_rules? : Rule[];

  entry_rules:  Rule[];       // store JSON/string expression
  exit_rules: Rule[];

  entry_timing?: string;
  exit_timing?: string;

  stoploss_type?: string;
  // Patch 72g: PORTFOLIO drawdown anchor. 'PEAK' or 'DAILY'.
  // Required (defaulted to PEAK at save layer) when stoploss_type==='PORTFOLIO'.
  portfolio_stoploss_anchor?: string | null;

  takeprofit_type?: string;
  stoploss_pct?: number;
  stoploss_max_pct?: number; // Patch 99: cap on ATR stop offset, % of anchor price
  stoploss_dollar?: number;


  takeprofit_pct?: number;
  takeprofit_dollar?:number;

  stoploss_timing?: string;
  takeprofit_timing?: string;
  atr_lookback_stp?: number;
  atr_lookback_tp?: number;

  ranking?: string;
  ranking_lookback?: number;
  ranking_order?: string;

  order_type?: string;
  limit_pct?: number;
  atr_limit_lookback?: number;
  // Patch 167 v2: mode-specific limit parameters (limit_params_json)
  limit_params?: { [key: string]: number } | null;

  universe?: string;
  capital?: number;
  slots?: number;
    // Patch F0: trader-editable substitute pool size. How many extra ranked
  // candidates beyond `slots` to cache as the substitute pool each night.
  // 0 disables substitution. Read by Position Manager (Phase C/C2) to split
  // proposedOrders into PROPOSED + SUBSTITUTE_POOL rows.
  substitute_pool_size?: number;
  // Hold Blackout: after a stock exits, block it from re-entry for
  // hold_blackout_days days. 0 (default) disables. hold_blackout_unit selects
  // how the days are counted: "calendar" or "trading".
  hold_blackout_days?: number | null;
  hold_blackout_unit?: string | null;
  rebalance_weekday?: number | null;
  // Patch 57: per-regime live execution sizing. Required when the parent
  // strategy has execution_enabled=true. Backtest uses `capital` above;
  // payload_builder swaps `capital` for this value at execution time.
  production_capital?: number | null;
  rebalance?: string;
  created_at?: string;
  max_time?: number;
  banned_months?: number[];   // <-- add this
  market_trend_rules_labels ?: string; 
  volatility_rules_labels ?: string; 
  entry_rules_labels ?: string; 
  exit_rules_labels ?: string; 

  entry_rules_tree ?: RuleTree;
  exit_rules_tree ?: RuleTree;

  freeze_rules_tree ?: RuleTree;
  resume_rules_tree ?: RuleTree;

  freeze_timing ?: string;
  resume_timing ?: string;
  /** Volatility safety net type.
   *   "none"           — no safety net (default)
   *   "simple"         — freeze/resume rule trees drive behaviour
   *   "spy_volatility" — stateful 4-escape model (Stage 3) */
  safety_net_type ?: string;

  safety_nets ?: SafetyNetItem[];
  market_trend_rules_tree ?: RuleTree;

  is_look_inside_bar?: boolean;
    /**
   * If true, all open positions belonging to THIS regime are force-closed at
   * next open when the market trend shifts away from this regime.
   * If false (default), positions are left to exit through normal signals
   * (RSI, stop loss, etc.) even after the regime flips.
   *
   * Matches Python QAS behavior: false everywhere.
   */
  close_positions_on_regime_exit?: boolean;

  sector_level?: number;
  sector_limit?: number;

  gap_filter_pct?: number;

  max_duplicates?: number;
  max_duplicate_sets?: number;
  tdom_filters?: TdomFilter[];
  vol_filter?: VolFilter | null;

    // LRA Patch 37: LONGSHORT system_type fields. All optional — only used
  // by LRA Pairs strategies. ROC strategies leave them undefined.
  // The JSON shapes are validated by the engine at backtest time; we keep
  // them as free-form dicts in the UI so iteration on the schema is cheap.
  ticker_classification?: Record<string, any>;
  pairing_entry_rules?: Record<string, any>;
  pairing_exit_rules?: Record<string, any>;
  sizing_policy?: Record<string, any>;
  pair_exit_policy?: Record<string, any>;
  entry_rules_tree_long?: Record<string, any>;
  entry_rules_tree_short?: Record<string, any>;
}

export interface TdomFilter {
  tdom?: number;           // 0 = 1st trading day of month, 1 = 2nd, etc.
  weekday?: number;        // 0 = Monday … 4 = Friday
  banned_months: number[]; // 1=Jan … 12=Dec
}

export interface VolFilter {
  enabled: boolean
  spy_ticker: string         // default "spy"
  vol_pct_bull: number       // 0.20 — bottom 20% excluded when SPY > SMA200
  vol_pct_bear: number       // 0.45 — bottom 45% excluded when SPY <= SMA200
  turnover_pct_bull: number  // 0.35
  turnover_pct_bear: number  // 0.05
  // Patch 118: configurable regime-SMA lookback, annual recalc trigger, and
  // avg parquet lookback. Optional — missing keys default server-side to
  // 200 / 1 / 0 / 21 (legacy behavior).
  spy_sma_lookback?: number  // default 200
  trigger_month?: number     // 1=Jan .. 12=Dec, default 1
  trigger_tdom?: number      // 0-indexed trading day of trigger_month, default 0
  avg_lookback?: number      // rolling window for avg_volume/avg_turnover, default 21
}