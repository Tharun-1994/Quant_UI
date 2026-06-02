import React, { useEffect, useState, useCallback } from "react";
import {
  Indicator,
  IndicatorUpdatePayload,
  fetchIndicators,
  saveIndicator,
  runIndicatorSync,
} from "../services/indicatorService.ts";
import { CATEGORY_COLOURS } from "../constants/uiConstants.ts";

// ── Content fields shown in the edit form ────────────────────────────────────
const CONTENT_FIELDS: {
  key: keyof IndicatorUpdatePayload;
  label: string;
  hint: string;
  rows: number;
}[] = [
  {
    key: "what_it_is",
    label: "What it is",
    hint: "Plain English — what does this indicator measure? No jargon. 2–3 sentences.",
    rows: 3,
  },
  {
    key: "how_it_works",
    label: "How it works",
    hint: "Simple explanation of the calculation. Enough for a non-engineer to understand without reading code.",
    rows: 3,
  },
  {
    key: "why_use_it",
    label: "Why use it",
    hint: "Why would someone pick this indicator? What problem does it solve?",
    rows: 3,
  },
  {
    key: "how_to_use_it",
    label: "How to use it",
    hint: "Practical guidance — typical values, what the lookback controls, common thresholds.",
    rows: 4,
  },
  {
    key: "example_rule",
    label: "Example rule",
    hint: "A concrete rule as it appears in the builder — e.g. rsi < 25",
    rows: 1,
  },
  {
    key: "example_explanation",
    label: "Example explanation",
    hint: "What that example rule means in plain English.",
    rows: 3,
  },
];

// CATEGORY_COLOURS imported from constants/uiConstants.ts

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const AdminIndicators: React.FC = () => {
  const [indicators, setIndicators]       = useState<Indicator[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [selected, setSelected]           = useState<Indicator | null>(null);
  const [formData, setFormData]           = useState<IndicatorUpdatePayload>({});
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [syncing, setSyncing]             = useState(false);
  const [syncResult, setSyncResult]       = useState<string | null>(null);
  const [filterIncomplete, setFilterIncomplete] = useState(false);

  // ── Load indicators ─────────────────────────────────────────────────────
  const loadIndicators = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchIndicators(filterIncomplete ? { incomplete_only: true } : undefined)
      .then(setIndicators)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filterIncomplete]);

  useEffect(() => { loadIndicators(); }, [loadIndicators]);

  // ── Select a row → open edit form ───────────────────────────────────────
  const handleSelect = (ind: Indicator) => {
    setSelected(ind);
    setSaveError(null);
    setSaveSuccess(false);
    setFormData({
      what_it_is:          ind.what_it_is          ?? "",
      how_it_works:        ind.how_it_works         ?? "",
      why_use_it:          ind.why_use_it           ?? "",
      how_to_use_it:       ind.how_to_use_it        ?? "",
      example_rule:        ind.example_rule         ?? "",
      example_explanation: ind.example_explanation  ?? "",
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await saveIndicator(selected.indicator_key, formData);
      setSaveSuccess(true);
      // Refresh the list so the badge updates
      loadIndicators();
      // Update selected indicator inline
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              ...formData,
              is_complete: Object.values({ ...prev, ...formData }).every(
                (v) => v !== null && v !== ""
              ),
            }
          : prev
      );
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail ?? err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Sync ────────────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await runIndicatorSync();
      const inserted = result.definitions_inserted.length;
      const msg =
        inserted > 0
          ? `Sync complete. ${inserted} new indicator(s) added: ${result.definitions_inserted.join(", ")}`
          : `Sync complete. No new indicators found.`;
      setSyncResult(msg);
      loadIndicators();
    } catch (err: any) {
      setSyncResult("Sync failed: " + (err.message ?? "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  // ── Counts ──────────────────────────────────────────────────────────────
  const totalCount      = indicators.length;
  const completeCount   = indicators.filter((i) => i.is_complete).length;
  const incompleteCount = totalCount - completeCount;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-6">

      {/* ── Header ── */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Indicator descriptions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage the descriptions shown on the public Indicators page.
            Click any row to edit.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? "Syncing..." : "Sync from registry"}
        </button>
      </div>

      {/* ── Sync result banner ── */}
      {syncResult && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          {syncResult}
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total indicators</p>
          <p className="text-2xl font-semibold text-gray-800">{totalCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Complete</p>
          <p className="text-2xl font-semibold text-green-700">{completeCount}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Needs description</p>
          <p className="text-2xl font-semibold text-orange-600">{incompleteCount}</p>
        </div>
      </div>

      {/* ── Filter toggle ── */}
      <div className="mb-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterIncomplete}
            onChange={(e) => setFilterIncomplete(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show only indicators needing descriptions
        </label>
      </div>

      {/* ── Main layout: table + edit form ── */}
      <div className={`grid gap-6 ${selected ? "grid-cols-2" : "grid-cols-1"}`}>

        {/* ── Table ── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Loading indicators...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">{error}</div>
          ) : indicators.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {filterIncomplete
                ? "All indicators have descriptions."
                : "No indicators found. Run sync to populate."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Indicator
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((ind) => (
                  <tr
                    key={ind.indicator_key}
                    onClick={() => handleSelect(ind)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      selected?.indicator_key === ind.indicator_key
                        ? "bg-indigo-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">
                        {ind.display_name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {ind.indicator_key}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {ind.category && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            CATEGORY_COLOURS[ind.category] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ind.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ind.is_complete ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Needs description
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Edit form ── */}
        {selected && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">

            {/* Form header */}
            <div className="bg-gray-50 border-b border-gray-200 px-5 py-4 flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">
                  {selected.display_name}
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {selected.indicator_key}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 mt-0.5"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Read-only metadata strip */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 text-xs text-gray-500">
              {selected.has_lookback && (
                <span>Lookback: default {selected.default_lookback ?? "—"} days</span>
              )}
              {selected.has_params && (
                <span className="text-indigo-600">Has extra params</span>
              )}
              {selected.universe_restriction && (
                <span className="text-amber-600">{selected.universe_restriction}</span>
              )}
              {selected.caution_note && (
                <span className="text-red-500">Has caution note</span>
              )}
            </div>

            {/* Fields */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {CONTENT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <p className="text-xs text-gray-400 mb-1.5">{field.hint}</p>
                  <textarea
                    rows={field.rows}
                    value={(formData[field.key] as string) ?? ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>

            {/* Save footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <div className="text-sm">
                {saveSuccess && (
                  <span className="text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Saved successfully
                  </span>
                )}
                {saveError && (
                  <span className="text-red-500 text-xs">{saveError}</span>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save descriptions"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminIndicators;