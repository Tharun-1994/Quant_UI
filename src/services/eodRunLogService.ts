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