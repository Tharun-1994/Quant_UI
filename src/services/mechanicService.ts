import API from "../config/api.ts";

// One selectable option for a mechanic's dropdown field (mirror of OptionValueOut).
export interface OptionValue {
  field: string;   // which config field this option belongs to, e.g. "stoploss_type"
  value: string;   // the value persisted on the strategy, e.g. "ATR_BASED"
  label: string;   // human-readable label shown in the UI
}

// Full mechanic detail returned by GET /api/mechanics and /api/mechanics/{key}.
// The first block is the DB row; config_fields / option_values / applies_to_regimes
// are merged in from the registry by the backend route.
export interface Mechanic {
  id: number;
  mechanic_key: string;
  display_name: string;
  group: string | null;
  what_it_is: string | null;
  how_it_works: string | null;
  why_use_it: string | null;
  how_to_use_it: string | null;
  example_rule: string | null;
  example_explanation: string | null;
  params_description: string | null;
  caution_note: string | null;
  status: string;
  sort_order: number;
  is_complete: boolean;
  config_fields: string[];
  option_values: OptionValue[];
  applies_to_regimes: string[];
}

// Structural-only shape returned by GET /api/mechanics/meta (no prose).
// Used to drive the centralised option enums (e.g. RegimeCard dropdowns).
export interface MechanicMeta {
  mechanic_key: string;
  display_name: string;
  group: string;
  config_fields: string[];
  option_values: OptionValue[];
  applies_to_regimes: string[];
  status: string;
  sort_order: number;
}

export interface MechanicUpdatePayload {
  what_it_is?: string;
  how_it_works?: string;
  why_use_it?: string;
  how_to_use_it?: string;
  example_rule?: string;
  example_explanation?: string;
  params_description?: string;
  caution_note?: string;
}

// GET /api/mechanics — full list (DB prose + merged registry fields), filterable.
export async function fetchMechanics(params?: {
  group?: string;
  regime_type?: string;
  incomplete_only?: boolean;
}): Promise<Mechanic[]> {
  const res = await API.get<Mechanic[]>("/mechanics", { params });
  return res.data;
}

// GET /api/mechanics/groups — canonical tab order (MECHANIC_GROUPS).
export async function fetchMechanicGroups(): Promise<string[]> {
  const res = await API.get<string[]>("/mechanics/groups");
  return res.data;
}

// GET /api/mechanics/meta — structural metadata straight from the registry.
export async function fetchMechanicsMeta(): Promise<MechanicMeta[]> {
  const res = await API.get<MechanicMeta[]>("/mechanics/meta");
  return res.data;
}

// GET /api/mechanics/{key} — single mechanic full detail.
export async function fetchMechanic(key: string): Promise<Mechanic> {
  const res = await API.get<Mechanic>(`/mechanics/${key}`);
  return res.data;
}

// POST /api/mechanics/{key} — save descriptions for one mechanic (admin).
export async function saveMechanic(
  key: string,
  payload: MechanicUpdatePayload
): Promise<{ success: boolean; is_complete: boolean; updated_fields: string[] }> {
  const res = await API.post(`/mechanics/${key}`, payload);
  return res.data;
}

// POST /api/admin/mechanics/sync — re-run the registry sync (admin).
export async function runMechanicSync(): Promise<{
  definitions_inserted: string[];
  definitions_refreshed: string[];
  orphaned_keys: string[];
  errors: string[];
}> {
  const res = await API.post("/admin/mechanics/sync");
  return res.data;
}