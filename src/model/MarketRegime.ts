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

  takeprofit_type?: string;
  stoploss_pct?: number;
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

  universe?: string;
  capital?: number;
  slots?: number;
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
}