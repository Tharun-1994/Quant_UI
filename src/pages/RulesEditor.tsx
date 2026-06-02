import React, { useEffect } from "react";
import { Rule } from "../model/MarketRegime";
import { OPERATORS, CONNECTORS, COMPARISON_TYPES } from "../constants/options.ts";
import { useIndicatorRegistry } from "../context/IndicatorRegistry.tsx";

interface Props {
  label: string;
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

const RulesEditor: React.FC<Props> = ({ label, rules, onChange }) => {
  // INDICATORS and INDICATOR_META were removed from options.ts.
  // All indicator data now comes from the API via useIndicatorRegistry().
  const { registry, indicatorsFor } = useIndicatorRegistry();
  const indicators = indicatorsFor("Normal", "entry", "lhs");
  const marketIndicators = indicatorsFor("Normal", "entry", "rhs");
  const getMeta = (key: string) => registry[key] ?? null;

  useEffect(() => {
    const copy = [...rules];
    let changed = false;
    for (let i = 0; i < copy.length; i++) {
      const current = copy[i];
      if (!current.value_type) {
        current.value_type = current.value > 0 ? "value" : "indicator_price";
        changed = true;
      }
    }
    if (changed) onChange(copy);
  }, [rules]);

  return (
    <div className="mb-6">
      {label && (
        <h4 className="font-semibold text-indigo-700 mb-3 flex items-center gap-2">
          <span className="text-indigo-500">📋</span>
          {label}
        </h4>
      )}

      <div className="space-y-4">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 grid grid-cols-1 sm:grid-cols-6 gap-4 items-end"
          >
            {/* Indicator */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Indicator
              </label>
              <select
                value={rule.indicator}
                onChange={(e) => {
                  const copy = [...rules];
                  const selected = e.target.value;
                  copy[idx].indicator = selected;
                  copy[idx].lookback = selected === "crsi" ? 2 : 0;
                  onChange(copy);
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(indicators).map(([key, lbl]) => (
                  <option key={key} value={key}>{lbl}</option>
                ))}
              </select>
            </div>

            {/* Lookback */}
            {(getMeta(rule.indicator)?.has_lookback ?? true) && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Lookback
                </label>
                <input
                  type="number"
                  value={rule.lookback}
                  onChange={(e) => {
                    const copy = [...rules];
                    copy[idx].lookback = +e.target.value;
                    onChange(copy);
                  }}
                  className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                  placeholder="e.g. 14"
                />
              </div>
            )}

            {/* Operator */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Operator
              </label>
              <select
                value={rule.operator}
                onChange={(e) => {
                  const copy = [...rules];
                  copy[idx].operator = e.target.value;
                  onChange(copy);
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
              >
                <option value="">Op</option>
                {Object.entries(OPERATORS).map(([key, lbl]) => (
                  <option key={key} value={key}>{lbl}</option>
                ))}
              </select>
            </div>

            {/* Value Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Value Type
              </label>
              <select
                value={rule.value_type || (rule.value > 0 ? "value" : "indicator_price")}
                onChange={(e) => {
                  const copy = [...rules];
                  copy[idx].value_type = e.target.value;
                  onChange(copy);
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(COMPARISON_TYPES).map(([key, lbl]) => (
                  <option key={key} value={key}>{lbl}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            {rule.value_type !== "indicator_price" && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  value={rule.value}
                  onChange={(e) => {
                    const copy = [...rules];
                    copy[idx].value = +e.target.value;
                    onChange(copy);
                  }}
                  className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                  placeholder="e.g. 70"
                />
              </div>
            )}

            {/* Compare To */}
            {(rule.value_type !== "value" || rule.value <= 0) && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Compare To
                </label>
                <select
                  value={rule.value_indicator}
                  onChange={(e) => {
                    const copy = [...rules];
                    copy[idx].value_indicator = e.target.value;
                    onChange(copy);
                  }}
                  className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                >
                  <option value="">-- Select --</option>
                  {Object.entries(marketIndicators).map(([key, lbl]) => (
                    <option key={key} value={key}>{lbl}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Compare-to Lookback */}
            {(rule.value_type !== "value" || rule.value <= 0) &&
              (getMeta(rule.value_indicator ?? "")?.has_lookback ?? true) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Lookback
                  </label>
                  <input
                    type="number"
                    value={rule.value_lookback}
                    onChange={(e) => {
                      const copy = [...rules];
                      copy[idx].value_lookback = +e.target.value;
                      onChange(copy);
                    }}
                    className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                    placeholder="e.g. 14"
                  />
                </div>
              )}

            {/* Connector + Remove */}
            <div className="flex items-end gap-2">
              <select
                value={rule.connector}
                onChange={(e) => {
                  const copy = [...rules];
                  copy[idx].connector = e.target.value;
                  onChange(copy);
                }}
                className="flex-1 border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
              >
                <option value="">--</option>
                {Object.entries(CONNECTORS).map(([key, lbl]) => (
                  <option key={key} value={key}>{lbl}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onChange(rules.filter((_, i) => i !== idx))}
                className="text-red-600 text-xs hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          onChange([
            ...rules,
            {
              label: "",
              indicator: "",
              lookback: 0,
              operator: "",
              value: 0,
              connector: "",
              value_type: "",
              value_lookback: 0,
              value_indicator: "",
            },
          ])
        }
        className="mt-3 text-indigo-600 text-sm hover:underline"
      >
        + Add Rule
      </button>
    </div>
  );
};

export default RulesEditor;