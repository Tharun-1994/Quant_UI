import API from "../config/api.ts";



export interface ExecutionEnabledStrategy {
  id: number;
  name: string;
  system_type: string;
  market_regime_type: string;
  production_capital: number | null;
}

export interface TradelistRow {
  id: number;
  strategy_id: number;
  strategy_name: string | null;
  entered_regime_id: number;
  ledger: string;
  source_tag: string;
  symbol: string;
  direction: string;
  status: string;
  proposal_date: string | null;
  intended_trade_date: string | null;
  limit_price: number | null;
  intended_qty: number | null;
  intended_capital: number | null;
  initial_stop_price: number | null;
  initial_tp_price: number | null;
  current_stop_price: number | null;
  ranking_rank: number | null;
  ranking_value: number | null;
  entry_date: string | null;
  entry_price: number | null;
  entry_timing: string | null;
  filled_qty: number | null;
  avg_fill_price: number | null;
  fill_status: string | null;
  exit_date: string | null;
  exit_price: number | null;
  exit_reason: string | null;
  profit: number | null;
}

export async function fetchExecutionEnabledStrategies(): Promise<ExecutionEnabledStrategy[]> {
  const { data } = await API.get<ExecutionEnabledStrategy[]>(
    "/tradelist/execution-enabled-strategies"
  );
  return data;
}

export async function fetchTradelistForStrategy(
  strategyId: number,
  opts?: { status?: string; ledger?: string; limit?: number }
): Promise<TradelistRow[]> {
  const params: Record<string, string | number> = {};
  if (opts?.status) params.status = opts.status;
  if (opts?.ledger) params.ledger = opts.ledger;
  if (opts?.limit) params.limit = opts.limit;
  const { data } = await API.get<TradelistRow[]>(
    `/tradelist/strategy/${strategyId}`,
    { params }
  );
  return data;
}

export async function patchCurrentStopPrice(
  rowId: number,
  currentStopPrice: number | null
): Promise<TradelistRow> {
  const { data } = await API.patch<TradelistRow>(
    `/tradelist/${rowId}/stop`,
    { current_stop_price: currentStopPrice }
  );
  return data;
}

export async function fetchBasketForDate(tradeDate: string): Promise<TradelistRow[]> {
  // tradeDate ISO YYYY-MM-DD
  const { data } = await API.get<TradelistRow[]>(`/tradelist/basket/${tradeDate}`);
  return data;
}


// Patch 39: M_Combined CSV download URL.
// Returns the absolute URL the browser uses for downloading the IBKR
// basket CSV. Used as the `href` on an <a download> element so the
// browser handles the file save automatically.
export function combinedBasketCsvUrl(tradeDate: string): string {
  // tradeDate ISO YYYY-MM-DD
  // API.defaults.baseURL ends with /api per config/api.ts setup
  const base = API.defaults.baseURL ?? "";
  return `${base}/tradelist/basket-csv/${tradeDate}`;
}

export function combinedBasketXlsxUrl(tradeDate: string): string {
  const base = API.defaults.baseURL ?? "";
  return `${base}/tradelist/basket-xlsx/${tradeDate}`;
}
export function combinedSubCsvUrl(tradeDate: string): string {
  const base = API.defaults.baseURL ?? "";
  return `${base}/tradelist/basket-csv-sub/${tradeDate}`;
}

// Adapts to wall-clock timing (pre-22:00 vs post-nightly).
export async function fetchLatestBasketDate(): Promise<string | null> {
  const { data } = await API.get<{ trade_date: string | null }>(
    "/tradelist/latest-basket-date"
  );
  return data.trade_date;
}

export function holdingsXlsxUrl(): string {
  const base = API.defaults.baseURL ?? "";
  return `${base}/tradelist/holdings-xlsx`;
}

export async function fetchAllLiveHoldings(): Promise<TradelistRow[]> {
  const { data } = await API.get<TradelistRow[]>('/tradelist/all-live-holdings');
  return data;
}


// ── Patch 82: date-targeted LIVE execution replay ───────────────────────────
export interface ReplaySummary {
  exits_applied: number;
  proposed_inserted: number;
  fills_resolved: number;
  fills_cancelled: number;
  exit_fills_resolved?: number;
  stop_updates_applied?: number;
  substitute_pool_inserted?: number;
  execution_disabled?: boolean;
  execution_disable_reason?: string | null;
  [k: string]: any;
}

export interface BrokerWriteSummary {
  trade_date: string;
  file_path: string;
  promoted_proposed: number;
  exits_written: number;
  orders_written: number;
  stop_rows_written?: number;
  [k: string]: any;
}

export interface ReplayResult {
  strategy_id: number;
  strategy_name: string;
  run_date: string;
  refreshed_data: boolean;
  broker?: BrokerWriteSummary | null;  // Patch 83: Step 0 broker_write result
  summary: ReplaySummary;
  equity: any;
}

/** Run the REAL Position Manager for one strategy on a chosen date (writes DB). */
export async function replayExecution(
  strategyId: number,
  runDate: string,
  opts?: { refreshData?: boolean; recomputeEquity?: boolean }
): Promise<ReplayResult> {
  const { data } = await API.post<ReplayResult>(`/eod/replay/${strategyId}`, {
    run_date: runDate,
    refresh_data: opts?.refreshData ?? true,
    recompute_equity: opts?.recomputeEquity ?? true,
  });
  return data;
}

// Patch 84: broker-write for a date — the "morning" promote step. Flips that
// date's PROPOSED -> PENDING_FILL and PENDING_EXIT -> EXIT_SUBMITTED and writes
// M_Combined_{date}.xlsx. Global (all execution_enabled strategies), not per-strategy.
export async function brokerWrite(tradeDate: string): Promise<BrokerWriteSummary> {
  const { data } = await API.post<BrokerWriteSummary>(`/eod/broker-write`, {
    trade_date: tradeDate,
  });
  return data;
}