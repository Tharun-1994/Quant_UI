// src/components/StrategyForm.tsx
import React, { useEffect, useState } from "react";
import { Strategy } from "../model/Strategy";
import {
  MARKET_REGIME_TYPE,
  REBALANCE,
  SYSTEM_TYPE,
} from "../constants/options.ts";
import { createStrategy,checkStrategyName } from "../services/strategyService.ts";

interface StrategyFormProps {
  initialValues?: Partial<Strategy>;
  mode: "new" | "edit";
  onSubmit: (values: Strategy) => Promise<void>;
  onNext: (strategy: Strategy) => void; // wizard flow → go to MarketRegimeTab
}

const StrategyForm: React.FC<StrategyFormProps> = ({
  initialValues,
  mode,
  onSubmit,
  onNext,
}) => {
const [form, setForm] = useState<Strategy>({
    id: 0,
    name: "",
    created_at: "",
    rebalance: "",
    start_date: "",
    end_date: "",
    min_quantity: 0,
    min_price: 0,
    system_type: "",
    market_regime_type: "",
    // F5: live-execution config (persisted by save-strategy)
    production_capital: null,
    execution_enabled: false,
    regimes: [],
    ...initialValues,
  });

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [isTaken, setIsTaken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setForm((prev) => ({
        ...prev,
        ...initialValues,
      }));
    }
  }, [initialValues]);

  useEffect(() => {
  // 1. Don't check if the name is too short or empty
  if (!form.name || form.name.length < 3) {
    setIsTaken(false);
    return;
  }

  // 2. Set up the debounce timer
  const controller = new AbortController();
  
  const timeoutId = setTimeout(async () => {
    setIsValidating(true);
    try {
      if(!form.id){
        const data = await checkStrategyName(form.name, controller.signal);
        setIsTaken(data.taken);
      }
      
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Validation error:", err);
      }
    } finally {
      setIsValidating(false);
    }
  }, 500); // Wait 500ms after last keystroke

  // 3. Cleanup: This cancels the API call if user types again quickly
  return () => {
    clearTimeout(timeoutId);
    controller.abort();
  };
}, [form.name]);

  const handleChange = (key: keyof Strategy, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(mode === "new" ? "Creating strategy…" : "Updating strategy…");

    try {
      console.log("Saving strategy:", form);
      const saved = await createStrategy(form); // ✅ FastAPI returns full strategy with id
      setMessage(
        mode === "new"
          ? "Strategy created successfully ✅"
          : "Strategy updated successfully ✅"
      );
      form.id =  saved.strategy_id;
      console.log("Saved strategy:", saved);
      // 🚀 Move to MarketRegimeTab after save
      onNext(form); // pass the real saved object (with id!)
    } catch (err) {
      setMessage("Failed to save ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-sm">
      {message && (
        <div className="p-3 rounded bg-gray-100 border border-gray-300">
          {message}
        </div>
      )}

      {/* GENERAL SETTINGS */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-indigo-700 mb-4 border-b pb-2">
          General Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Strategy Name */}
          <div>
            <label className="block mb-1 font-medium">Strategy Name</label>
            <div className="relative">
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Momentum V1"
                className={`w-full px-3 py-2 rounded-lg border focus:ring ${
                  isTaken ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-indigo-400"
                }`}
              />
              
              {/* Show a small spinner or text while checking */}
              {isValidating && (
                <span className="absolute right-3 top-2 text-xs text-gray-400">Checking...</span>
              )}
            </div>

            {/* Error Message */}
            {isTaken && !isValidating && (
              <p className="mt-1 text-sm text-red-600">This strategy name is already taken.</p>
            )}
          </div>

          {/* Rebalance */}
          <div>
            <label className="block mb-1 font-medium">Rebalance</label>
            <select
              value={form.rebalance}
              onChange={(e) => handleChange("rebalance", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring focus:ring-indigo-400"
            >
              <option value="">-- Select --</option>
              {Object.entries(REBALANCE).map(([key, label]) => (
                <option key={key} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* System Type */}
          <div>
            <label className="block mb-1 font-medium">System Type</label>
            <select
              value={form.system_type}
              onChange={(e) => handleChange("system_type", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring focus:ring-indigo-400"
            >
              <option value="">-- Select --</option>
              {Object.entries(SYSTEM_TYPE).map(([key, label]) => (
                <option key={key} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>


        </div>
      </div>

      {/* PORTFOLIO SETTINGS */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-indigo-700 mb-4 border-b pb-2">
          Portfolio Settings
        </h3>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block mb-1 font-medium">Start Date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">End Date</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => handleChange("end_date", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring focus:ring-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* CONSTRAINTS */}
      <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-indigo-700 mb-4 border-b pb-2">
          Constraints
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Minimum Price</label>
            <input
              type="number"
              value={form.min_price}
              onChange={(e) => handleChange("min_price", +e.target.value)}
              placeholder="e.g. 5"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring focus:ring-indigo-400"
            />
          </div>
<div>
            <label className="block mb-1 font-medium">Minimum Quantity</label>
            <input
              type="number"
              value={form.min_quantity}
              onChange={(e) => handleChange("min_quantity", +e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring focus:ring-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* MARKET REGIME TYPE */}{/* Patch 58: production_capital removed from this page — moved to the
          regime card (Patch 59). Execution enabled remains the strategy-level
          kill switch. */}
      <div className="bg-white p-4 rounded-2xl shadow-sm">
        <h3 className="text-lg font-semibold text-indigo-700 mb-4 border-b pb-2">
          Live execution
        </h3>
        <div>
          <label className="block mb-1 font-medium">Execution enabled</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={!!form.execution_enabled}
              onChange={(e) => handleChange("execution_enabled", e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-400"
            />
            <span className={form.execution_enabled ? "text-green-700 font-medium" : "text-gray-500"}>
              {form.execution_enabled ? "Live — runs nightly" : "Off — backtest only"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            When on, nightly PM runs include this strategy and proposed orders are generated.
            Requires production_capital &gt; 0 on every regime.
          </p>
        </div>
      </div>

      <div>
        <label className="block mb-1 font-medium">Select Regime Type</label>
        <select
        value={form.market_regime_type}
        onChange={(e) => handleChange("market_regime_type", e.target.value)}
        className="px-3 py-2 border rounded-lg"
        >
        <option value="">-- Select --</option>
        {Object.entries(MARKET_REGIME_TYPE).map(([key, label]) => (
            <option key={key} value={label}>{label}</option>
        ))}
        </select>
      </div>

            

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50"
        >
          {mode === "new" ? "Next → Market Regime" : "Update & Next → Market Regime"}
        </button>
      </div>
    </form>
  );
};

export default StrategyForm;
