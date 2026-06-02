/**
 * IndicatorRegistry.tsx
 * =====================
 * React context that fetches /api/indicators/meta ONCE on app startup
 * and makes indicator metadata available everywhere in the app.
 *
 * Usage:
 *   const { labelFor, indicatorsFor, registry } = useIndicatorRegistry();
 *
 *   labelFor("rsi", 3)                              → "RSI (3)"
 *   indicatorsFor("Normal", "entry", "lhs")         → { rsi: "RSI", sma: "SMA", ... }
 *   registry["sharpe"].params                       → structured param definitions
 *   registry["n_week_high_recent"].kind             → "boolean"
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import API from "../config/api.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IndicatorParam {
  key: string;
  label: string;
  type: "number" | "text";
  default: number | string;
  min?: number;
}

export interface AvailabilityRow {
  regime_type: string;
  section: string;
  side: string;
  context_note: string | null;
  sort_order: number;
}

export interface IndicatorMeta {
  indicator_key: string;
  display_name: string;
  category: string;
  has_lookback: boolean;
  default_lookback: number | null;
  has_params: boolean;
  params: IndicatorParam[];
  kind: string | null;
  has_range: boolean;
  universe_restriction: string | null;
  caution_note: string | null;
  sort_order: number;
  availability: AvailabilityRow[];
}

// ── Context ───────────────────────────────────────────────────────────────────

interface RegistryContextValue {
  registry: Record<string, IndicatorMeta>;
  loading: boolean;
  indicatorsFor: (regime_type: string, section: string, side: string) => Record<string, string>;
  labelFor: (key: string, lookback?: number) => string;
}

const DEFAULT_CTX: RegistryContextValue = {
  registry: {},
  loading: true,
  indicatorsFor: () => ({}),
  labelFor: (key) => key,
};

const IndicatorRegistryContext = createContext<RegistryContextValue>(DEFAULT_CTX);

// ── Provider ──────────────────────────────────────────────────────────────────

export const IndicatorRegistryProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [registry, setRegistry] = useState<Record<string, IndicatorMeta>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get<IndicatorMeta[]>("/indicators/meta")
      .then((res) => {
        const map: Record<string, IndicatorMeta> = {};
        res.data.forEach((ind) => { map[ind.indicator_key] = ind; });
        setRegistry(map);
      })
      .catch((err) => {
        console.error(
          "[IndicatorRegistry] Failed to load indicator metadata. " +
          "Dropdowns will be empty until the API is reachable.",
          err
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const indicatorsFor = useCallback(
    (regime_type: string, section: string, side: string): Record<string, string> => {
      const matched: { key: string; name: string; order: number }[] = [];
      Object.values(registry).forEach((ind) => {
        const row = ind.availability.find(
          (a) => a.regime_type === regime_type && a.section === section && a.side === side
        );
        if (row) matched.push({ key: ind.indicator_key, name: ind.display_name, order: row.sort_order });
      });
      matched.sort((a, b) => a.order - b.order);
      const result: Record<string, string> = {};
      matched.forEach(({ key, name }) => { result[key] = name; });
      return result;
    },
    [registry]
  );

  const labelFor = useCallback(
    (key: string, lookback?: number): string => {
      const base = registry[key]?.display_name ?? key;
      return lookback && lookback > 0 ? `${base} (${lookback})` : base;
    },
    [registry]
  );

  return (
    <IndicatorRegistryContext.Provider value={{ registry, loading, indicatorsFor, labelFor }}>
      {children}
    </IndicatorRegistryContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useIndicatorRegistry = (): RegistryContextValue =>
  useContext(IndicatorRegistryContext);