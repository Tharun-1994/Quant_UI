export interface DrawdownRecord {
  start_date: string;  // ISO date
  end_date: string;
  length: number;
  max_dd: number;
  avg_dd: number;
}

export interface YearlyReturn {
  year: number;
  strategy: number;
  trades_per_year: number;
  spy?: number | null; // can be null for N/A
}

// One calendar year of strategy returns, broken out by month.
// `months` is always length 12 (Jan..Dec); a value is null where the
// strategy had no equity history for that month (rendered blank in the
// heatmap). `total` mirrors the figure on the Yearly Returns tab.
export interface MonthlyReturnRow {
  year: number;
  months: (number | null)[];
  total: number | null;
}

// One calendar year of closed-trade counts, broken out by month.
// `months` is always length 12 (Jan..Dec); null for months outside the
// strategy's equity coverage. `total` matches `trades_per_year`.
export interface MonthlyTradesRow {
  year: number;
  months: (number | null)[];
  total: number;
}

export interface PerformanceMetrics {
  total_profit: number;
  total_trades: number;
  avg_trade_profit: number;
  max_drawdown: number;
  win_rate_pct: number;
  profit_factor: number;
  sharpe_ratio: number;
  k_ratio: number;
  avg_trade_len: number;
  top10_dd: DrawdownRecord[];
  yearly_returns: YearlyReturn[];
  monthly_returns: MonthlyReturnRow[];
  monthly_trades: MonthlyTradesRow[];
}