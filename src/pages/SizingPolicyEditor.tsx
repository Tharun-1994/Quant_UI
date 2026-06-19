import React from "react";
import {
  SIZING_MODES,
  RISK_OPTIONS,
  SIZING_CAPS,
} from "../constants/options.ts";

interface Props {
  value: any;
  onChange: (v: any) => void;
}

const SizingPolicyEditor: React.FC<Props> = ({ value, onChange }) => {
  const v = value || {};
  const params = v.params || {};
  const bands = Array.isArray(params.bands) ? params.bands : [];
  const overrides = Array.isArray(params.overrides) ? params.overrides : [];

  const setMode = (mode: string) => onChange({ ...v, mode: mode || undefined });
  const setParams = (patch: any) => onChange({ ...v, params: { ...params, ...patch } });

  const setBand = (i: number, patch: any) => {
    const next = [...bands];
    next[i] = { ...(next[i] || {}), ...patch };
    setParams({ bands: next });
  };
  const addBand = () =>
    setParams({ bands: [...bands, { max: null, cap_a: 0, cap_b: 0 }] });
  const removeBand = (i: number) =>
    setParams({ bands: bands.filter((_: any, j: number) => j !== i) });

  const setOverride = (i: number, patch: any) => {
    const next = [...overrides];
    next[i] = { ...(next[i] || {}), ...patch };
    setParams({ overrides: next });
  };
  const addOverride = () =>
    setParams({
      overrides: [
        ...overrides,
        { long_risk: "", short_risk: "", long_cap: "cap_a", short_cap: "cap_a" },
      ],
    });
  const removeOverride = (i: number) =>
    setParams({ overrides: overrides.filter((_: any, j: number) => j !== i) });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Mode</label>
        <select
          value={v.mode ?? ""}
          onChange={(e) => setMode(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">— select —</option>
          {Object.entries(SIZING_MODES).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {v.mode === "fixed_dollar_per_leg" && (
        <>
          <div className="border-t pt-3">
            <label className="block text-sm font-semibold mb-1">Conditional indicator</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={params.conditional_on ?? ""}
                onChange={(e) =>
                  setParams({ conditional_on: e.target.value || undefined })
                }
                placeholder="e.g. vix_close"
                className="border rounded px-2 py-1 text-sm w-40"
              />
              <input
                type="number"
                min={0}
                value={params.conditional_on_lookback ?? 0}
                onChange={(e) =>
                  setParams({
                    conditional_on_lookback: parseInt(e.target.value || "0", 10),
                  })
                }
                className="w-24 border rounded px-2 py-1 text-sm"
                title="Lookback"
              />
              <span className="text-xs text-gray-500">lookback days</span>
            </div>
          </div>

          <div className="border-t pt-3">
            <h5 className="text-sm font-bold mb-2">Bands</h5>
            <p className="text-xs text-gray-500 mb-2">
              First band whose max is ≥ today's conditional value wins. Leave max
              blank for an unbounded final band.
            </p>
            <table className="w-full border text-sm mb-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">Max value</th>
                  <th className="px-2 py-1 text-left">Cap A ($)</th>
                  <th className="px-2 py-1 text-left">Cap B ($)</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {bands.map((b: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        step="0.01"
                        value={b.max ?? ""}
                        onChange={(e) =>
                          setBand(i, {
                            max: e.target.value === "" ? null : parseFloat(e.target.value),
                          })
                        }
                        placeholder="(unbounded)"
                        className="w-28 border rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={b.cap_a ?? 0}
                        onChange={(e) =>
                          setBand(i, { cap_a: parseFloat(e.target.value || "0") })
                        }
                        className="w-28 border rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={b.cap_b ?? 0}
                        onChange={(e) =>
                          setBand(i, { cap_b: parseFloat(e.target.value || "0") })
                        }
                        className="w-28 border rounded px-1 py-0.5 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => removeBand(i)}
                        className="text-xs px-2 py-0.5 bg-red-500 text-white rounded"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {bands.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-2 py-3 text-center text-xs text-gray-500">
                      No bands configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addBand}
              className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + Add band
            </button>
          </div>

          <div className="border-t pt-3">
            <h5 className="text-sm font-bold mb-2">
              Overrides (by pair attribute combo)
            </h5>
            <p className="text-xs text-gray-500 mb-2">
              For specific (long_risk, short_risk) combos, override which cap each leg uses.
            </p>
            <table className="w-full border text-sm mb-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">Long risk</th>
                  <th className="px-2 py-1 text-left">Short risk</th>
                  <th className="px-2 py-1 text-left">Long cap</th>
                  <th className="px-2 py-1 text-left">Short cap</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((o: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      <select
                        value={o.long_risk ?? ""}
                        onChange={(e) => setOverride(i, { long_risk: e.target.value })}
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
                        value={o.short_risk ?? ""}
                        onChange={(e) => setOverride(i, { short_risk: e.target.value })}
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
                        value={o.long_cap ?? "cap_a"}
                        onChange={(e) => setOverride(i, { long_cap: e.target.value })}
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        {Object.entries(SIZING_CAPS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={o.short_cap ?? "cap_a"}
                        onChange={(e) => setOverride(i, { short_cap: e.target.value })}
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        {Object.entries(SIZING_CAPS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => removeOverride(i)}
                        className="text-xs px-2 py-0.5 bg-red-500 text-white rounded"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {overrides.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-center text-xs text-gray-500">
                      No overrides
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              type="button"
              onClick={addOverride}
              className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + Add override
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SizingPolicyEditor;