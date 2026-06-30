import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Indicator, AvailabilityRow, fetchIndicators } from "../services/indicatorService.ts";
import { CATEGORY_COLOURS } from "../constants/uiConstants.ts";
// mechanics:BEGIN  (revert: delete this block)
import {
  Mechanic,
  fetchMechanics,
  fetchMechanicGroups,
} from "../services/mechanicService.ts";
type ViewKey = "indicators" | "mechanics";
// mechanics:END

// ── Types ────────────────────────────────────────────────────────────────────
type TabKey = "entry" | "exit" | "market_regime" | "volatility";
type RegimeKey = "equity" | "etf";

const TABS: { key: TabKey; label: string }[] = [
  { key: "entry",         label: "Entry" },
  { key: "exit",          label: "Exit" },
  { key: "market_regime", label: "Market regime" },
  { key: "volatility",    label: "Volatility" },
];

const REGIME_MAP: Record<RegimeKey, string[]> = {
  equity: ["Normal", "Simple", "Complex"],
  etf:    ["Individual ETFs - Simple"],
};

// CATEGORY_COLOURS imported from constants/uiConstants.ts

// ── Detail drawer ─────────────────────────────────────────────────────────────
interface DrawerProps {
  indicator: Indicator | null;
  onClose: () => void;
}

const DetailDrawer: React.FC<DrawerProps> = ({ indicator, onClose }) => {
  if (!indicator) return null;

  const sections = [
    { label: "What it is",    value: indicator.what_it_is },
    { label: "How it works",  value: indicator.how_it_works },
    { label: "Why use it",    value: indicator.why_use_it },
    { label: "How to use it", value: indicator.how_to_use_it },
  ];

  return (
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Back */}

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-800 text-base">
            {indicator.display_name}
          </h3>
          <span className="text-xs font-mono text-gray-400 mt-0.5 block">
            {indicator.indicator_key}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Metadata pills */}
      <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50 text-xs">
        {indicator.category && (
          <span className={`px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOURS[indicator.category] ?? "bg-gray-100 text-gray-600"}`}>
            {indicator.category}
          </span>
        )}
        {indicator.has_lookback && (
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
            Lookback · default {indicator.default_lookback ?? "—"} days
          </span>
        )}
        {indicator.has_params && (
          <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
            Has params
          </span>
        )}
        {indicator.universe_restriction && (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
            {indicator.universe_restriction}
          </span>
        )}
      </div>

      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">

        {/* Main content sections */}
        {sections.map(({ label, value }) =>
          value ? (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {label}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
            </div>
          ) : null
        )}

        {/* Example rule */}
        {(indicator.example_rule || indicator.example_explanation) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Example
            </p>
            {indicator.example_rule && (
              <code className="block text-sm font-mono text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded mb-2">
                {indicator.example_rule}
              </code>
            )}
            {indicator.example_explanation && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {indicator.example_explanation}
              </p>
            )}
          </div>
        )}

        {/* Params description */}
        {indicator.has_params && indicator.params_description && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Parameters
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {indicator.params_description}
            </p>
          </div>
        )}

        {/* Caution note */}
        {indicator.caution_note && (
          <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-800 leading-relaxed">
              {indicator.caution_note}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!indicator.what_it_is && !indicator.how_it_works && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">
              No description added yet.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              An admin can add descriptions via the Indicator descriptions page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Indicator row ─────────────────────────────────────────────────────────────
interface RowProps {
  indicator: Indicator;
  availRows: AvailabilityRow[];
  isSelected: boolean;
  onClick: () => void;
}

const IndicatorRow: React.FC<RowProps> = ({
  indicator, availRows, isSelected, onClick,
}) => {
  // Get unique context notes for this tab
  const contextNotes = [...new Set(
    availRows.map((r) => r.context_note).filter(Boolean)
  )];

  return (
    <tr
      onClick={onClick}
      className={`border-b border-gray-100 cursor-pointer transition-colors ${
        isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
      }`}
    >
      <td className="px-5 py-4" style={{ width: "38%" }}>
        <p className="font-medium text-gray-800 text-sm">{indicator.display_name}</p>
        <p className="text-xs font-mono text-gray-400 mt-0.5">{indicator.indicator_key}</p>
        {contextNotes.map((note, i) => (
          <p key={i} className="text-xs text-amber-600 mt-1">{note}</p>
        ))}
      </td>
      <td className="px-5 py-4" style={{ width: "18%" }}>
        {indicator.category && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLOURS[indicator.category] ?? "bg-gray-100 text-gray-600"}`}>
            {indicator.category}
          </span>
        )}
      </td>
      <td className="px-5 py-4">
        {indicator.what_it_is ? (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
            {indicator.what_it_is}
          </p>
        ) : (
          <p className="text-sm text-gray-300 italic">No description yet</p>
        )}
      </td>
      <td className="px-4 py-4 text-right" style={{ width: "32px" }}>
        <svg className={`w-4 h-4 transition-colors ${isSelected ? "text-indigo-500" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </td>
    </tr>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
// mechanics:BEGIN  (revert: delete this whole block)
// ── Mechanics view (Rule-info "Mechanics" tab) ──────────────────────────────
const GROUP_COLOURS: Record<string, string> = {
  "Exit & Risk":          "bg-rose-50 text-rose-700",
  "Order & Execution":    "bg-amber-50 text-amber-700",
  "Selection & Sizing":   "bg-indigo-50 text-indigo-700",
  "Concentration":        "bg-teal-50 text-teal-700",
  "Calendar & Liquidity": "bg-violet-50 text-violet-700",
  "Regime":               "bg-sky-50 text-sky-700",
};

const MechanicDetailDrawer: React.FC<{ mechanic: Mechanic | null; onClose: () => void }> = ({ mechanic, onClose }) => {
  if (!mechanic) return null;
  const sections = [
    { label: "What it is",    value: mechanic.what_it_is },
    { label: "How it works",  value: mechanic.how_it_works },
    { label: "Why use it",    value: mechanic.why_use_it },
    { label: "How to use it", value: mechanic.how_to_use_it },
  ];
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-start justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-800 text-base">{mechanic.display_name}</h3>
          <span className="text-xs font-mono text-gray-400 mt-0.5 block">{mechanic.mechanic_key}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5" aria-label="Close">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50 text-xs">
        {mechanic.group && (
          <span className={`px-2 py-0.5 rounded-full font-medium ${GROUP_COLOURS[mechanic.group] ?? "bg-gray-100 text-gray-600"}`}>
            {mechanic.group}
          </span>
        )}
        {mechanic.applies_to_regimes && mechanic.applies_to_regimes.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            {mechanic.applies_to_regimes.length >= 4 ? "All strategy types" : mechanic.applies_to_regimes.join(", ")}
          </span>
        )}
        {mechanic.status && mechanic.status !== "live" && (
          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{mechanic.status}</span>
        )}
      </div>
      <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
        {sections.map(({ label, value }) =>
          value ? (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
            </div>
          ) : null
        )}
        {(mechanic.example_rule || mechanic.example_explanation) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Example</p>
            {mechanic.example_rule && (
              <code className="block text-sm font-mono text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded mb-2">{mechanic.example_rule}</code>
            )}
            {mechanic.example_explanation && (
              <p className="text-sm text-gray-600 leading-relaxed">{mechanic.example_explanation}</p>
            )}
          </div>
        )}
        {mechanic.option_values && mechanic.option_values.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Options</p>
            <div className="space-y-1.5">
              {mechanic.option_values.map((o, i) => (
                <div key={i} className="flex items-baseline gap-2 text-sm">
                  <code className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{o.value}</code>
                  <span className="text-gray-600">{o.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {mechanic.params_description && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Parameters</p>
            <p className="text-sm text-gray-700 leading-relaxed">{mechanic.params_description}</p>
          </div>
        )}
        {mechanic.config_fields && mechanic.config_fields.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Where you set it</p>
            <div className="flex flex-wrap gap-1.5">
              {mechanic.config_fields.map((f) => (
                <code key={f} className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{f}</code>
              ))}
            </div>
          </div>
        )}
        {mechanic.caution_note && (
          <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-800 leading-relaxed">{mechanic.caution_note}</p>
          </div>
        )}
        {!mechanic.what_it_is && !mechanic.how_it_works && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">No description added yet.</p>
            <p className="text-xs text-gray-400 mt-1">Run the mechanic seed, or add descriptions via the admin page.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const MechanicRow: React.FC<{ mechanic: Mechanic; isSelected: boolean; onClick: () => void }> = ({ mechanic, isSelected, onClick }) => (
  <tr onClick={onClick} className={`border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
    <td className="px-5 py-4" style={{ width: "38%" }}>
      <p className="font-medium text-gray-800 text-sm">{mechanic.display_name}</p>
      <p className="text-xs font-mono text-gray-400 mt-0.5">{mechanic.mechanic_key}</p>
    </td>
    <td className="px-5 py-4" style={{ width: "18%" }}>
      {mechanic.group && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GROUP_COLOURS[mechanic.group] ?? "bg-gray-100 text-gray-600"}`}>
          {mechanic.group}
        </span>
      )}
    </td>
    <td className="px-5 py-4">
      {mechanic.what_it_is ? (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{mechanic.what_it_is}</p>
      ) : (
        <p className="text-sm text-gray-300 italic">No description yet</p>
      )}
    </td>
    <td className="px-4 py-4 text-right" style={{ width: "32px" }}>
      <svg className={`w-4 h-4 transition-colors ${isSelected ? "text-indigo-500" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </td>
  </tr>
);

const MechanicsView: React.FC = () => {
  const [groups, setGroups]           = useState<string[]>([]);
  const [mechanics, setMechanics]     = useState<Mechanic[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selected, setSelected]       = useState<Mechanic | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchMechanicGroups(), fetchMechanics()])
      .then(([grps, mechs]) => {
        setGroups(grps);
        setMechanics(mechs);
        setActiveGroup((prev) => prev ?? grps[0] ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const displayList = mechanics
    .filter((m) => m.group === activeGroup)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-5 flex-wrap">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => { setActiveGroup(g); setSelected(null); }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeGroup === g ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <div className={`grid gap-5 ${selected ? "grid-cols-2" : "grid-cols-1"}`}>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading mechanics...</div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 text-sm">{error}</div>
          ) : displayList.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No mechanics in this group.</div>
          ) : (
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3" style={{ width: "38%" }}>Mechanic</th>
                  <th className="text-left px-5 py-3" style={{ width: "18%" }}>Group</th>
                  <th className="text-left px-5 py-3">Description</th>
                  <th style={{ width: "32px" }}></th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((m) => (
                  <MechanicRow
                    key={m.mechanic_key}
                    mechanic={m}
                    isSelected={selected?.mechanic_key === m.mechanic_key}
                    onClick={() => setSelected(selected?.mechanic_key === m.mechanic_key ? null : m)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
        {selected && <MechanicDetailDrawer mechanic={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
};
// mechanics:END
const IndicatorsPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab]         = useState<TabKey>("entry");
  const [regimeKey, setRegimeKey]         = useState<RegimeKey>("equity");
  const [indicators, setIndicators]       = useState<Indicator[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [selected, setSelected]           = useState<Indicator | null>(null);
  const [activeSide, setActiveSide]       = useState<"lhs" | "rhs">("lhs");
  // mechanics:BEGIN  (revert: delete this block)
  const [view, setView] = useState<ViewKey>("indicators");
  // mechanics:END

  // ── Fetch whenever tab or regime changes ──────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setSelected(null);

    // For market_regime, all regimes use the same indicators
    const regimeTypes = REGIME_MAP[regimeKey];

    // Fetch both LHS and RHS in parallel
    Promise.all([
      fetchIndicators({ section: activeTab, side: "lhs",
        regime_type: regimeTypes[0] }),
      fetchIndicators({ section: activeTab, side: "rhs",
        regime_type: regimeTypes[0] }),
    ])
      .then(([lhs, rhs]) => {
        // Merge: attach availability rows from both queries
        const merged = new Map<string, Indicator>();
        [...lhs, ...rhs].forEach((ind) => {
          if (!merged.has(ind.indicator_key)) {
            merged.set(ind.indicator_key, { ...ind });
          } else {
            const existing = merged.get(ind.indicator_key)!;
            const newAvail = ind.availability.filter(
              (a) => !existing.availability.find(
                (e) => e.section === a.section && e.side === a.side && e.regime_type === a.regime_type
              )
            );
            existing.availability = [...existing.availability, ...newAvail];
          }
        });
        setIndicators(Array.from(merged.values()));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeTab, regimeKey]);

  useEffect(() => { load(); }, [load]);

  // Split into LHS / RHS for display
  const regimeTypes = REGIME_MAP[regimeKey];
  const lhsIndicators = indicators.filter((ind) =>
    ind.availability.some(
      (a) => a.side === "lhs" && a.section === activeTab &&
             regimeTypes.includes(a.regime_type)
    )
  );
  const rhsIndicators = indicators.filter((ind) =>
    ind.availability.some(
      (a) => a.side === "rhs" && a.section === activeTab &&
             regimeTypes.includes(a.regime_type)
    )
  );

  const displayList = activeSide === "lhs" ? lhsIndicators : rhsIndicators;

  // ── Get availability rows for a specific indicator in the current context ──
  const getAvailRows = (ind: Indicator) =>
    ind.availability.filter(
      (a) => a.section === activeTab &&
             a.side === activeSide &&
             regimeTypes.includes(a.regime_type)
    );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-6">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Rule info</h1>
          <p className="text-sm text-gray-500 mt-1">
            {/* mechanics: view-aware subtitle */}
            {view === "mechanics"
              ? "Reference guide for the mechanics that act on your trades — exits, orders, ranking, sizing, filters and regime control."
              : "Reference guide for every indicator available in the strategy builder."}
          </p>
        </div>
        <div className="px-5 pt-4">
          <Link to="/main" className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase hover:text-indigo-600 transition-colors">
            ← Main menu
          </Link>
        </div>
      </div>

      {/* mechanics:BEGIN  view toggle + branch open (revert: delete this block AND the matching close block below) */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs text-gray-500 font-medium">View</span>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
          {(["indicators", "mechanics"] as ViewKey[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setSelected(null); }}
              className={`px-4 py-1.5 transition-colors ${
                view === v ? "bg-indigo-600 text-white font-medium" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v === "indicators" ? "Indicators" : "Mechanics"}
            </button>
          ))}
        </div>
      </div>

      {view === "mechanics" && <MechanicsView />}
      {view === "indicators" && (<>
      {/* mechanics:END */}
      {/* ── Regime toggle ── */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs text-gray-500 font-medium">Strategy type</span>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
          {(["equity", "etf"] as RegimeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRegimeKey(r); setSelected(null); }}
              className={`px-4 py-1.5 transition-colors ${
                regimeKey === r
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {r === "equity" ? "Equity" : "ETF"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSelected(null); setActiveSide("lhs"); }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── LHS / RHS sub-toggle ── */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden text-xs">
          <button
            onClick={() => { setActiveSide("lhs"); setSelected(null); }}
            className={`px-3 py-1.5 transition-colors ${
              activeSide === "lhs"
                ? "bg-gray-800 text-white font-medium"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Indicators
          </button>
          <button
            onClick={() => { setActiveSide("rhs"); setSelected(null); }}
            className={`px-3 py-1.5 transition-colors ${
              activeSide === "rhs"
                ? "bg-gray-800 text-white font-medium"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            Value indicators
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {activeSide === "lhs"
            ? "The indicator on the left side of your rule — what you are measuring."
            : "The value on the right side of your rule — what you are comparing against."}
        </p>
      </div>

      {/* ── Main content ── */}
      <div className={`grid gap-5 ${selected ? "grid-cols-2" : "grid-cols-1"}`}>

        {/* ── Indicator table ── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Loading indicators...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 text-sm">{error}</div>
          ) : displayList.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              No indicators available for this section and strategy type.
            </div>
          ) : (
            <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-5 py-3" style={{ width: "38%" }}>Indicator</th>
                  <th className="text-left px-5 py-3" style={{ width: "18%" }}>Category</th>
                  <th className="text-left px-5 py-3">Description</th>
                  <th style={{ width: "32px" }}></th>
                </tr>
              </thead>
              <tbody>
                {displayList.map((ind) => (
                  <IndicatorRow
                    key={ind.indicator_key}
                    indicator={ind}
                    availRows={getAvailRows(ind)}
                    isSelected={selected?.indicator_key === ind.indicator_key}
                    onClick={() =>
                      setSelected(
                        selected?.indicator_key === ind.indicator_key ? null : ind
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Detail drawer ── */}
        {selected && (
          <DetailDrawer
            indicator={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
      {/* mechanics:BEGIN  view branch close (revert: delete this block) */}
      </>)}
      {/* mechanics:END */}
    </div>
  );
};

export default IndicatorsPage;