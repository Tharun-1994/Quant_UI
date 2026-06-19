/**
 * uploadedSystemService.ts
 * ========================
 * API calls for the System Comparison feature. Mirrors strategyService.ts:
 * every request goes through the shared axios instance in config/api.ts
 * (whose baseURL already ends in /api), so paths here start at /uploaded-systems.
 */
import API from "../config/api.ts";

export interface UploadedSystem {
  id: number;
  name: string;
  starting_capital: number;
  start_date: string | null;
  end_date: string | null;
  n_trades: number | null;
  created_at: string | null;
}

export interface CompareSystem {
  id: number;
  name: string;
  color: string;
  metrics: Record<string, number>;
  yearly: Record<string, number>;
}

export interface MetricRow {
  key: string;
  label: string;
}

export interface ComparePayload {
  figure: { data: any[]; layout: any };
  table: {
    systems: CompareSystem[];
    spy: Record<string, number>;
    years: number[];
    metric_rows: MetricRow[];
  };
}

export async function listUploadedSystems(): Promise<UploadedSystem[]> {
  const { data } = await API.get<UploadedSystem[]>("/uploaded-systems");
  return data;
}

export async function uploadSystem(
  name: string,
  equityFile: File,
  tradelistFile: File,
  startingCapital?: number
): Promise<UploadedSystem> {
  const form = new FormData();
  form.append("name", name);
  if (startingCapital !== undefined && !Number.isNaN(startingCapital)) {
    form.append("starting_capital", String(startingCapital));
  }
  form.append("equity", equityFile);
  form.append("tradelist", tradelistFile);
  // Override the instance default (application/json); the browser fills in the
  // multipart boundary automatically.
  const { data } = await API.post<UploadedSystem>("/uploaded-systems", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteUploadedSystem(id: number): Promise<void> {
  await API.delete(`/uploaded-systems/${id}`);
}

export async function updateStartingCapital(
  id: number,
  startingCapital: number
): Promise<UploadedSystem> {
  const { data } = await API.patch<UploadedSystem>(`/uploaded-systems/${id}`, {
    starting_capital: startingCapital,
  });
  return data;
}

export async function compareUploadedSystems(
  ids: number[],
  scale: "indexed" | "absolute" = "indexed"
): Promise<ComparePayload> {
  const params = new URLSearchParams({ ids: ids.join(","), scale });
  const { data } = await API.get<ComparePayload>(
    `/uploaded-systems/compare?${params.toString()}`
  );
  return data;
}