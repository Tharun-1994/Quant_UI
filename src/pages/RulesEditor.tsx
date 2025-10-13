import React, { useEffect } from "react";
import { Rule } from "../model/MarketRegime";
import { INDICATORS, OPERATORS, CONNECTORS, INDICATOR_CONFIG, COMPARISON_TYPES, MARKET_INDICATORS, } from "../constants/options.ts";

interface Props {
  label: string;
  rules: Rule[];
  onChange: (rules: Rule[]) => void;
}

const RulesEditor: React.FC<Props> = ({ label, rules, onChange }) => {

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

    if (changed) {
      onChange(copy);
    }
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
            {/* Label */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Label
              </label>
              <input
                type="text"
                value={rule.label || ""}
                onChange={(e) => {
                  const copy = [...rules];
                  copy[idx].label = e.target.value;
                  onChange(copy);
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                placeholder="Name this rule"
              />
            </div>

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

                  // ✅ Auto-set lookback = 2 if crsi is selected
                  if (selected === "crsi") {
                    copy[idx].lookback = 2;
                  }else{
                    copy[idx].lookback = 0;
                  }

                  onChange(copy);
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(INDICATORS).map(([key, lbl]) => (
                  <option key={key} value={key}>
                    {lbl}
                  </option>
                ))}
              </select>

            </div>


            {/* Lookback */}
            {rule.indicator !== "unadjusted_close" && (
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
                  <option key={key} value={key}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            {/** Indicator/ Price */}
               
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Value Type
              </label>
              <select
                value={
                  rule.value_type ||
                  (rule.value > 0 ? "value" : "indicator_price") // 👈 fallback default
                }
                onChange={(e) => {
                  const copy = [...rules];
                  copy[idx].value_type = e.target.value;
                  onChange(copy);
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(COMPARISON_TYPES).map(([key, lbl]) => (
                  <option key={key} value={key}>
                    {lbl}
                  </option>
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
                {Object.entries(MARKET_INDICATORS).map(([key, lbl]) => (
                  <option key={key} value={key}>
                    {lbl}
                  </option>
                ))}
              </select>
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
                  <option key={key} value={key}>
                    {lbl}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  onChange(rules.filter((_, i) => i !== idx))
                }
                className="text-red-600 text-xs hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Rule Button */}
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
