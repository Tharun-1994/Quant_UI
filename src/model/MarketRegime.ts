
// src/model/Strategy.ts
export interface Rule {
  indicator: string;
  lookback: number;
  operator: string;
  value: number;
  connector: string;
  label?: string;
  value_type?: string;
  value_indicator?: string;
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

  takeprofit_type?: string;
  stoploss_pct?: number;
  takeprofit_pct?: number;
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
}
