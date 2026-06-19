import React from "react";
import {
  RISK_OPTIONS,
  SWAP_TARGETS,
  PAIRING_POOLS,
  PAIRING_SELECTIONS,
} from "../constants/options.ts";

interface Props {
  value: any;
  onChange: (v: any) => void;
}

const PairingRulesEditor: React.FC<Props> = ({ value, onChange }) => {
  const v = value || {};
  const combos = Array.isArray(v.disallowed_combos) ? v.disallowed_combos : [];
  const bt = v.backtracking || {};

  const setCombos = (next: any[]) => onChange({ ...v, disallowed_combos: next });
  const setCombo = (i: number, patch: any) => {
    const next = [...combos];
    next[i] = { ...next[i], ...patch };
    setCombos(next);
  };
  const addCombo = () => setCombos([...combos, { long_risk: "", short_risk: "" }]);
  const removeCombo = (i: number) =>
    setCombos(combos.filter((_: any, j: number) => j !== i));

  const setBT = (patch: any) =>
    onChange({ ...v, backtracking: { ...bt, ...patch } });

  return (
    <div className="space-y-4">
      <div>
        <h5 className="text-sm font-bold mb-2">Disallowed combos</h5>
        <p className="text-xs text-gray-500 mb-2">
          Pair (long_risk, short_risk) classifications that are not allowed to form.
        </p>
        <table className="w-full border text-sm mb-2">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Long risk</th>
              <th className="px-2 py-1 text-left">Short risk</th>
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {combos.map((c: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="px-2 py-1">
                  <select
                    value={c.long_risk ?? ""}
                    onChange={(e) => setCombo(i, { long_risk: e.target.value })}
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
                    value={c.short_risk ?? ""}
                    onChange={(e) => setCombo(i, { short_risk: e.target.value })}
                    className="border rounded px-1 py-0.5 text-xs"
                  >
                    <option value="">—</option>
                    {Object.entries(RISK_OPTIONS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => removeCombo(i)}
                    className="text-xs px-2 py-0.5 bg-red-500 text-white rounded"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {combos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-3 text-center text-xs text-gray-500">
                  None
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <button
          type="button"
          onClick={addCombo}
          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + Add combo
        </button>
      </div>

      <div className="border-t pt-3">
        <h5 className="text-sm font-bold mb-2">Backtracking</h5>
        <p className="text-xs text-gray-500 mb-3">
          When a candidate pair hits a disallowed combo, swap one leg with a
          replacement from the pre-reduction pool.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Swap target</label>
            <select
              value={bt.swap_target ?? ""}
              onChange={(e) => setBT({ swap_target: e.target.value || undefined })}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">—</option>
              {Object.entries(SWAP_TARGETS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Pool</label>
            <select
              value={bt.pool ?? ""}
              onChange={(e) => setBT({ pool: e.target.value || undefined })}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">—</option>
              {Object.entries(PAIRING_POOLS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Exclude risk</label>
            <select
              value={bt.exclude_risk ?? ""}
              onChange={(e) =>
                setBT({ exclude_risk: e.target.value || undefined })
              }
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">— none —</option>
              {Object.entries(RISK_OPTIONS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Selection</label>
            <select
              value={bt.selection ?? ""}
              onChange={(e) => setBT({ selection: e.target.value || undefined })}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="">—</option>
              {Object.entries(PAIRING_SELECTIONS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PairingRulesEditor;