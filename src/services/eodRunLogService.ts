import API from "../config/api.ts";


export interface EodRunLogRow {
  id: number;
  run_date: string;
  step: string;
  strategy_id: number | null;
  strategy_name: string | null;
  status: string;
  rows_affected: number | null;
  started_at: string | null;
  finished_at: string | null;
  error_msg: string | null;
}

export interface RetryResponse {
  eod_run_log_id: number;
  original_id: number;
  step: string;
  status: string;
  detail: string;
}

export async function fetchEodRunLog(opts?: {
  from_date?: string;
  to_date?: string;
  status_filter?: string;
  step_filter?: string;
  strategy_id?: number;
  limit?: number;
}): Promise<EodRunLogRow[]> {
  const { data } = await API.get<EodRunLogRow[]>("/eod/run-log", {
    params: opts ?? {},
  });
  return data;
}

export async function retryEodRunLogStep(logId: number): Promise<RetryResponse> {
  const { data } = await API.post<RetryResponse>(`/eod/run-log/${logId}/retry`);
  return data;
}

// Patch 112: revert the latest SUCCESS execution_step run for a strategy+date.
export interface RevertResponse {
  log_id: number;
  strategy_id: number;
  run_date: string;
  rows_restored: number;
  rows_recreated: number;
  rows_deleted: number;
  note: string;
}

export async function revertExecution(
  strategyId: number,
  runDate: string
): Promise<RevertResponse> {
  const { data } = await API.post<RevertResponse>(
    `/eod/revert-execution?strategy_id=${strategyId}&run_date=${runDate}`
  );
  return data;
}

export interface TriggerResponse {
  status: string;
  pid: number;
  message: string;
}

export async function triggerNightly(): Promise<TriggerResponse> {
  const { data } = await API.post<TriggerResponse>("/eod/trigger-nightly");
  return data;
}

export async function triggerMorning(tradeDate?: string): Promise<TriggerResponse> {
  const params = tradeDate ? { trade_date: tradeDate } : {};
  const { data } = await API.post<TriggerResponse>("/eod/trigger-morning", null, { params });
  return data;
}

// Add after triggerMorning

export interface TestTriggerNightlyRequest {
  run_date: string;        // YYYY-MM-DD
  strategy_id?: number;   // omit = all execution_enabled strategies
}

export async function triggerNightlyTest(
  request: TestTriggerNightlyRequest
): Promise<TriggerResponse> {
  const { data } = await API.post<TriggerResponse>(
    "/eod/trigger-nightly-test",
    request
  );
  return data;
}

export interface TestTriggerNightlyResponse {
  status: string;
  run_date: string;
  trade_date: string;
  strategies_run: number;
  results: Array<{
    status: string;
    strategy_id: number;
    strategy_name: string;
    entries_count?: number;
    exits_count?: number;
    holdings_seeded?: number;
    csv_path?: string;
    error?: string;
  }>;
}

export async function triggerNightlyTestWithCsv(
  runDate: string,
  strategyId: number | undefined,
  csvText: string | null,
): Promise<TestTriggerNightlyResponse> {
  const { data } = await API.post<TestTriggerNightlyResponse>(
    '/eod/trigger-nightly-test',
    {
      run_date: runDate,
      ...(strategyId !== undefined ? { strategy_id: strategyId } : {}),
      ...(csvText ? { mock_holdings_csv: csvText } : {}),
    }
  );
  return data;
}

export interface OverlayAndWriteResponse {
  strategy_id: number;
  strategy_name: string;
  override_date: string;
  overrides_recorded: number;
  elided: number;
  substituted: number;
  adjusted_capital: number;
  half_sized: number;
  skipped_no_match: number;
  orders_written: number;
  exits_written: number;
  file_path: string;
}

export async function overlayAndWrite(
  strategyId: number,
  overrideDate: string,
  csvText: string,
  uploadedBy?: string,
): Promise<OverlayAndWriteResponse> {
  const { data } = await API.post<OverlayAndWriteResponse>(
    `/eod/overlay-and-write/${strategyId}`,
    { override_date: overrideDate, csv_text: csvText, uploaded_by: uploadedBy ?? 'ui' },
  );
return data;
}

export interface StrategyOverlayItem {
  strategy_name: string;
  csv_text: string;
}

export interface StrategyOverlayResult {
  strategy_name: string;
  strategy_id: number;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
  overrides_recorded: number;
  elided: number;
  substituted: number;
  adjusted_capital: number;
  half_sized: number;
  skipped_no_match: number;
}

export interface OverlayAndWriteAllResponse {
  trade_date: string;
  strategies_run: number;
  strategies_ok: number;
  strategies_failed: number;
  overlay_results: StrategyOverlayResult[];
  orders_written: number;
  exits_written: number;
  file_path: string;
}

export async function overlayAndWriteAll(
  tradeDate: string,
  strategies: StrategyOverlayItem[],
): Promise<OverlayAndWriteAllResponse> {
  const { data } = await API.post<OverlayAndWriteAllResponse>(
    '/eod/overlay-and-write-all',
    { trade_date: tradeDate, strategies },
  );
    return data;
}

export async function overlayAndWriteCombined(
  csvText: string,
): Promise<OverlayAndWriteAllResponse> {
  const { data } = await API.post<OverlayAndWriteAllResponse>(
    '/eod/overlay-and-write-combined',
    { csv_text: csvText },
  );
  return data;
}
// ── Patch 77: "Update today's prices" — append-only refresh of the static
// backtest universes + index series to the latest posted Norgate session.
// Backs the dashboard button. Synchronous: resolves with the per-universe /
// per-index summary (POST /api/eod/refresh-universes-today).
export interface UniverseRefreshItem {
  slug?: string;        // present on universe rows
  key?: string;         // present on index-series rows
  status: "APPENDED" | "CURRENT" | "SKIPPED" | "ERROR";
  last_stored?: string;
  appended?: string[];
  num_tickers?: number;
  restated?: string[];
  reason?: string;
}

export interface RefreshUniversesTodayResponse {
  requested_end: string;
  resolved_data_date: string;
  today_excluded: boolean;
  universes: UniverseRefreshItem[];
  index: UniverseRefreshItem[];
  restated_any: string[];
  has_errors: boolean;
}

export async function refreshUniversesToday(): Promise<RefreshUniversesTodayResponse> {
  const { data } = await API.post<RefreshUniversesTodayResponse>(
    "/eod/refresh-universes-today"
  );
  return data;
}