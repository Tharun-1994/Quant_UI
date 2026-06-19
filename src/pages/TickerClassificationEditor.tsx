import React, { useState } from "react";
import { RISK_OPTIONS, RANGE_TIER_OPTIONS } from "../constants/options.ts";

interface Props {
  value: any;
  onChange: (v: any) => void;
}

const TickerClassificationEditor: React.FC<Props> = ({ value, onChange }) => {
  const map = value || {};
  const tickers = Object.keys(map);
  const [newTicker, setNewTicker] = useState("");

  const setRow = (ticker: string, patch: any) => {
    onChange({
      ...map,
      [ticker]: { ...(map[ticker] || {}), ...patch },
    });
  };

  const removeRow = (ticker: string) => {
    const copy = { ...map };
    delete copy[ticker];
    onChange(copy);
  };

  const addRow = () => {
    const t = newTicker.trim().toUpperCase();
    if (!t || map[t]) return;
    onChange({
      ...map,
      [t]: { risk: "", range_tier: "", min_daily_range_pct: 0 },
    });
    setNewTicker("");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        One row per ticker. The engine consumes this map by symbol — case-sensitive.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Ticker</th>
              <th className="px-2 py-1 text-left">Risk</th>
              <th className="px-2 py-1 text-left">Range Tier</th>
              <th className="px-2 py-1 text-left">Min Daily Range %</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {tickers.map((t) => {
              const row = map[t] || {};
              return (
                <tr key={t} className="border-t">
                  <td className="px-2 py-1 font-mono">{t}</td>
                  <td className="px-2 py-1">
                    <select
                      value={row.risk ?? ""}
                      onChange={(e) => setRow(t, { risk: e.target.value })}
                      className="border rounded px-1 py-0.5 text-xs"
                    >
                      <option value="">—</option>
                      {Object.entries(RISK_OPTIONS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.range_tier ?? ""}
                      onChange={(e) => setRow(t, { range_tier: e.target.value })}
                      className="border rounded px-1 py-0.5 text-xs"
                    >
                      <option value="">—</option>
                      {Object.entries(RANGE_TIER_OPTIONS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={row.min_daily_range_pct ?? ""}
                      onChange={(e) =>
                        setRow(t, {
                          min_daily_range_pct: e.target.value
                            ? parseFloat(e.target.value)
                            : 0,
                        })
                      }
                      className="w-24 border rounded px-1 py-0.5 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => removeRow(t)}
                      className="text-xs px-2 py-0.5 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
            {tickers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-center text-xs text-gray-500">
                  No tickers configured
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t">
        <input
          type="text"
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value)}
          placeholder="Ticker (e.g. SPY)"
          className="border rounded px-2 py-1 text-sm w-40"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addRow();
            }
          }}
        />
        <button
          type="button"
          onClick={addRow}
          className="text-sm px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Add Ticker
        </button>
      </div>
    </div>
  );
};

export default TickerClassificationEditor;