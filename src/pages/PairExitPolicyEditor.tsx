import React from "react";
import { FORCE_CLOSE_METHODS, PNL_METHODS } from "../constants/options.ts";

interface Props {
  value: any;
  onChange: (v: any) => void;
}

const PairExitPolicyEditor: React.FC<Props> = ({ value, onChange }) => {
  const v = value || {};
  const fc = v.force_close || {};
  const pe = v.profit_exit || {};

  const set = (patch: any) => onChange({ ...v, ...patch });
  const setFC = (patch: any) => set({ force_close: { ...fc, ...patch } });
  const setPE = (patch: any) => set({ profit_exit: { ...pe, ...patch } });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1">Max hold sessions</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={v.max_hold_sessions ?? ""}
            onChange={(e) =>
              set({
                max_hold_sessions: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
            className="w-32 border rounded px-2 py-1 focus:ring focus:ring-indigo-200"
          />
          <span className="text-xs text-gray-500">
            Force close after N trading sessions since entry
          </span>
        </div>
      </div>

      <div className="border-t pt-3">
        <h5 className="text-sm font-bold mb-2">Force close</h5>
        <label className="block text-sm font-semibold mb-1">Method</label>
        <select
          value={fc.method ?? ""}
          onChange={(e) => setFC({ method: e.target.value || undefined })}
          className="border rounded px-2 py-1 focus:ring focus:ring-indigo-200"
        >
          <option value="">— select —</option>
          {Object.entries(FORCE_CLOSE_METHODS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t pt-3">
        <h5 className="text-sm font-bold mb-2">Profit exit</h5>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={!!pe.enabled}
            onChange={(e) => setPE({ enabled: e.target.checked })}
          />
          <span className="text-sm font-semibold">Enabled</span>
        </label>
        {pe.enabled && (
          <div className="space-y-2 pl-6">
            <div>
              <label className="block text-sm font-semibold mb-1">Threshold</label>
              <input
                type="number"
                step="0.01"
                value={pe.threshold ?? ""}
                onChange={(e) =>
                  setPE({
                    threshold: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="w-32 border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">P&L method</label>
              <select
                value={pe.pnl_method ?? ""}
                onChange={(e) => setPE({ pnl_method: e.target.value || undefined })}
                className="border rounded px-2 py-1"
              >
                <option value="">— select —</option>
                {Object.entries(PNL_METHODS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PairExitPolicyEditor;