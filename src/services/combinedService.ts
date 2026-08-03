// Patch 123: combined-system service — shared axios instance throughout.
import API from "../config/api.ts";

export interface MemberOverrides {
  curr_hold_1?: number | null;
  seed_1?: number | null;
  seed_other?: number | null;
}

export interface CombinedMember {
  member_strategy_id: number;
  strategy_name?: string;
  priority: number;
  is_active?: boolean;
  seed_source_ids: number[];
  overrides: MemberOverrides | null;
}

export interface CombinedState {
  members: CombinedMember[];
  config: any | null;
}

export interface GateToday {
  date: string;
  trade_open: boolean;
  branch: string;
  ibs: number;
}

export async function fetchCombined(combinedId: number): Promise<CombinedState> {
  const res = await API.get<CombinedState>(`/combined/${combinedId}`);
  return res.data;
}

export async function saveCombined(
  combinedId: number, members: CombinedMember[], config: any,
): Promise<{ ok: boolean; members: number }> {
  const res = await API.post(`/combined/${combinedId}/save`, {
    members: members.map(m => ({
      member_strategy_id: m.member_strategy_id,
      priority: m.priority,
      is_active: true,
      seed_source_ids: m.seed_source_ids,
      overrides: m.overrides,
    })),
    config,
  });
  return res.data;
}

export async function simulateCombined(
  combinedId: number,
): Promise<{ trades: number; gated_days: number; days: number }> {
  const res = await API.post(`/combined/${combinedId}/simulate`);
  return res.data;
}

// Patch 123: live gate verdict for the status line. Returns null when the
// endpoint or data isn't available yet — the UI shows "unknown" instead of
// pretending.
export async function fetchGateToday(combinedId: number): Promise<GateToday | null> {
  try {
    const res = await API.get<GateToday>(`/combined/${combinedId}/gate-today`);
    return res.data;
  } catch {
    return null;
  }
}
// Patch 147: evening execution step — members stepped as scouts, allocation
// at the PRODUCTION profile, PROPOSED rows written for the combined. Errors
// bubble (unlike fetchGateToday) so the operator sees the loud message.
export interface CombinedExecuteResult {
  combined_id: number;
  combined_name: string;
  run_date: string;
  intended_trade_date: string;
  gate: { open: boolean; label: string; ibs: number; enabled: boolean };
  production_capital: number;
  production_min_to_enter: number;
  member_candidates: Record<string, number>;
  orders_allocated: number;
  proposed_inserted: number;
  substitute_pool_inserted: number;
  deleted: number;
}

export async function executeCombined(
  combinedId: number,
  body?: { run_date?: string; data_root?: string },
): Promise<CombinedExecuteResult> {
  const res = await API.post<CombinedExecuteResult>(
    `/combined/${combinedId}/execute`, body ?? {});
  return res.data;
}