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
}
