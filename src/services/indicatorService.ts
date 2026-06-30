import API from "../config/api.ts";

export interface AvailabilityRow {
  id: number;
  indicator_key: string;
  regime_type: string;
  section: string;
  side: string;
  context_note: string | null;
  sort_order: number;
}

export interface Indicator {
  id: number;
  indicator_key: string;
  display_name: string;
  category: string | null;
  what_it_is: string | null;
  how_it_works: string | null;
  why_use_it: string | null;
  how_to_use_it: string | null;
  example_rule: string | null;
  example_explanation: string | null;
  has_lookback: boolean;
  default_lookback: number | null;
  has_params: boolean;
  params_description: string | null;
  universe_restriction: string | null;
  caution_note: string | null;
  sort_order: number;
  is_complete: boolean;
  availability: AvailabilityRow[];
}

export interface IndicatorUpdatePayload {
  what_it_is?: string;
  how_it_works?: string;
  why_use_it?: string;
  how_to_use_it?: string;
  example_rule?: string;
  example_explanation?: string;
}

export async function fetchIndicators(params?: {
  regime_type?: string;
  section?: string;
  side?: string;
  category?: string;
  incomplete_only?: boolean;
}): Promise<Indicator[]> {
  const res = await API.get<Indicator[]>("/indicators", { params });
  return res.data;
}

export async function fetchIndicator(key: string): Promise<Indicator> {
  const res = await API.get<Indicator>(`/indicators/${key}`);
  return res.data;
}

export async function saveIndicator(
  key: string,
  payload: IndicatorUpdatePayload
): Promise<{ success: boolean; is_complete: boolean; updated_fields: string[] }> {
  const res = await API.post(`/indicators/${key}`, payload);
  return res.data;
}

export async function runIndicatorSync(): Promise<{
  definitions_inserted: string[];
  definitions_refreshed: string[];
  availability_inserted: object[];
  availability_skipped: number;
  orphaned_keys: string[];
  errors: string[];
}> {
  const res = await API.post("/admin/indicators/sync");
  return res.data;
}