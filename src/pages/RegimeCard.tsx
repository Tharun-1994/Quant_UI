import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { MarketRegime, RuleTree, SafetyNetItem, TdomFilter, VolFilter } from "../model/MarketRegime";
import {
  INDEX_TICKERS,
  ORDER_TYPE,
  STOPLOSS_TYPE,
  TAKEPROFIT_TYPE,
  RISK_TIMING,
  RANKING_ORDERS,
  SAFETY_NET_TYPES,
  UNIVERSES,
  SIGNAL_TIMING,
  REBALANCE,
  INDIVIDUAL_ETFS,
} from "../constants/options.ts";
import { MONTH_LABELS, TDOM_LABELS, WD_LABELS } from "../constants/uiConstants.ts";
import RulesTreeEditor, { nodeToExpr, RulePillsDisplay } from "../pages/RuleTreeEditor.tsx";
import { getRegimeConfig } from "../config/regimeConfig.ts";
import RuleEditorModal from "../pages/RuleEditorModal.tsx";
import { useIndicatorRegistry } from "../context/IndicatorRegistry.tsx";

interface Props {
  regime: MarketRegime;
  onUpdate: (r: MarketRegime) => void;
}

type ActiveEditor =
  // rule editors (wide modal)
  | "entry"
  | "exit"
  | "market_trend"
  | "safety_net"
  // risk param editors (narrower modal)
  | "stoploss"
  | "takeprofit"
  | "order"
  | "ranking"
  | "gap_filter"
  | "duplicates"
  | "banned_months"
  | "tdom"
  | "vol_filter"
  | null;

// MONTH_LABELS, TDOM_LABELS, WD_LABELS imported from constants/uiConstants.ts

// Walk a rule tree to collect leaf-rule count and a flattened expression preview.
const summarizeTree = (
  tree?: RuleTree
): { count: number; logic: "AND" | "OR"; expression: string } => {
  if (!tree || !tree.children || tree.children.length === 0) {
    return { count: 0, logic: "AND", expression: "" };
  }
  let count = 0;
  const walk = (node: any) => {
    if (node.type === "rule") count++;
    else if (node.type === "group") node.children.forEach(walk);
  };
  walk(tree);
  let expression = "";
  try {
    expression = nodeToExpr(tree);
  } catch {
    expression = "";
  }
  return {
    count,
    logic: (tree.logic as "AND" | "OR") ?? "AND",
    expression,
  };
};

// Small reusable card used in the Risk & Portfolio Parameters column.
const RiskOverviewCard: React.FC<{
  label: string;
  summary: string;
  isEmpty?: boolean;
  onEdit: () => void;
}> = ({ label, summary, isEmpty, onEdit }) => (
  <div className="bg-gray-50 rounded-lg p-3 border flex items-center justify-between gap-3">
    <div className="min-w-0 flex-1">
      <div className="text-sm font-bold text-gray-800">{label}</div>
      <div className="text-xs text-gray-500 truncate">{summary}</div>
    </div>
    <button
      type="button"
      onClick={onEdit}
      className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition whitespace-nowrap shrink-0 font-medium"
    >
      {isEmpty ? "+ Add" : "Edit"}
    </button>
  </div>
);

const RegimeCard: React.FC<Props> = ({ regime, onUpdate }) => {
  const { indicatorsFor, labelFor, registry } = useIndicatorRegistry();

  const makeEmptyTree = (): RuleTree => ({
    type: "group",
    id: "root",
    logic: "AND",
    children: [],
  });

  const [entryTree, setEntryTree] = useState<RuleTree>(
    () => regime.entry_rules_tree ?? makeEmptyTree()
  );
  const [exitTree, setExitTree] = useState<RuleTree>(
    () => regime.exit_rules_tree ?? makeEmptyTree()
  );

  const [safetyNets, setSafetyNets] = useState<SafetyNetItem[]>(() => {
    const r: any = regime;
    if (Array.isArray(r.safety_nets) && r.safety_nets.length > 0) {
      return r.safety_nets;
    }
    const legacyType = (r.safety_net_type || "none").toLowerCase();
    if (legacyType === "none") return [];
    if (legacyType === "simple") {
      return [{
        type: "simple",
        params: {
          freeze_rules_tree:  r.freeze_rules_tree  ?? makeEmptyTree(),
          resume_rules_tree:  r.resume_rules_tree  ?? makeEmptyTree(),
          freeze_timing:      r.freeze_timing      || "open",
          resume_timing:      r.resume_timing      || "open",
        },
      }];
    }
    return [{ type: legacyType, params: {} }];
  });

  const isIndividualEtfSimple =
    regime.regime_type === "Individual ETFs - Simple";

  const config = getRegimeConfig(regime.regime_type);
  const [marketTrendRulesTree, setMarketTrendRulesTree] = useState<RuleTree>(
    () => (regime as any).market_trend_rules_tree ?? makeEmptyTree()
  );

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEtfs = useMemo(() => {
    if (!isIndividualEtfSimple) return [];
    const raw = (regime.universe || "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [isIndividualEtfSimple, regime.universe]);

  const toggleEtf = (ticker: string) => {
    const next = selectedEtfs.includes(ticker)
      ? selectedEtfs.filter((x) => x !== ticker)
      : [...selectedEtfs, ticker];

    onUpdate({ ...regime, universe: next.join(",") });
  };

  const [openEtfDropdown, setOpenEtfDropdown] = useState(false);
  const etfRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!etfRef.current) return;
      if (!etfRef.current.contains(e.target as Node))
        setOpenEtfDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setEntryTree(regime.entry_rules_tree ?? makeEmptyTree());
    setExitTree(regime.exit_rules_tree ?? makeEmptyTree());
    setMarketTrendRulesTree(regime.market_trend_rules_tree ?? makeEmptyTree());
  }, [regime.id]);

  useEffect(() => {
    onUpdate({ ...regime, entry_rules_tree: entryTree });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryTree]);

  useEffect(() => {
    onUpdate({ ...regime, exit_rules_tree: exitTree });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitTree]);

  // Bug 4 fix: only propagate trees when the freeze toggle is ON.
  // When OFF, send null so the engine receives no freeze/resume rules.
  useEffect(() => {
    const firstSimple = safetyNets.find((sn) => sn.type === "simple");
    onUpdate({
      ...regime,
      safety_nets: safetyNets,
      safety_net_type: safetyNets.length > 0 ? safetyNets[0].type : "none",
      // Back-compat mirror — first simple's trees & timings into regime-level fields
      freeze_rules_tree: firstSimple?.params?.freeze_rules_tree,
      resume_rules_tree: firstSimple?.params?.resume_rules_tree,
      freeze_timing:      firstSimple?.params?.freeze_timing || "open",
      resume_timing:      firstSimple?.params?.resume_timing || "open",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safetyNets]);

  useEffect(() => {
    onUpdate({ ...regime, market_trend_rules_tree: marketTrendRulesTree });
  }, [marketTrendRulesTree]);

  useEffect(() => {
    onUpdate({ ...regime, exit_rules_tree: exitTree });
  }, [regime.id]);

  // ── Modal helpers ──
  const closeModal = () => setActiveEditor(null);

  const modalConfig: { title: string; maxWidth: string } = (() => {
    switch (activeEditor) {
      case "entry":
        return { title: "Edit Entry Rules", maxWidth: "1024px" };
      case "exit":
        return { title: "Edit Exit Rules", maxWidth: "1024px" };
      case "market_trend":
        return { title: "Edit Market Trend Rules", maxWidth: "1024px" };
      case "safety_net":
        return { title: "Edit Safety Net", maxWidth: "1024px" };
      case "stoploss":
        return { title: "Edit Stoploss", maxWidth: "480px" };
      case "takeprofit":
        return { title: "Edit Takeprofit", maxWidth: "480px" };
      case "order":
        return { title: "Edit Order Settings", maxWidth: "480px" };
      case "ranking":
        return { title: "Edit Ranking", maxWidth: "520px" };
      case "gap_filter":
        return { title: "Edit Gap Filter", maxWidth: "480px" };
      case "duplicates":
        return { title: "Edit Duplicate Positions", maxWidth: "480px" };
      case "banned_months":
        return { title: "Edit Banned Months", maxWidth: "520px" };
      case "tdom":
        return { title: "Edit TDOM Filters", maxWidth: "720px" };
      case "vol_filter":
        return { title: "Edit Vol / Turnover Filter", maxWidth: "720px" };
      default:
        return { title: "", maxWidth: "1024px" };
    }
  })();

  const modalSubtitle = (() => {
    const parts: string[] = [];
    if (regime.regime_type) parts.push(regime.regime_type);
    if (regime.universe && !isIndividualEtfSimple)
      parts.push(regime.universe);
    return parts.join(" · ");
  })();

  // ── Risk subsection summaries ──
  const stoplossSummary = (() => {
    if (!regime.stoploss_type) return { text: "Not configured", isEmpty: true };
    const parts: string[] = [regime.stoploss_type];
    if (regime.stoploss_type === "DOLLAR_BASED" && regime.stoploss_dollar) {
      parts.push(`$${regime.stoploss_dollar}`);
    } else if (regime.stoploss_type !== "DOLLAR_BASED" && regime.stoploss_pct) {
      parts.push(`${regime.stoploss_pct}%`);
    }
    if (regime.stoploss_type === "ATR_BASED" && regime.atr_lookback_stp) {
      parts.push(`ATR(${regime.atr_lookback_stp})`);
    }
    if (regime.stoploss_timing) parts.push(regime.stoploss_timing);
    return { text: parts.join(" · "), isEmpty: false };
  })();

  const takeprofitSummary = (() => {
    if (!regime.takeprofit_type) return { text: "Not configured", isEmpty: true };
    const parts: string[] = [regime.takeprofit_type];
    if (regime.takeprofit_type === "DOLLAR_BASED" && regime.takeprofit_dollar) {
      parts.push(`$${regime.takeprofit_dollar}`);
    } else if (
      regime.takeprofit_type !== "DOLLAR_BASED" &&
      regime.takeprofit_pct
    ) {
      parts.push(`${regime.takeprofit_pct}%`);
    }
    if (regime.takeprofit_type === "ATR_BASED" && regime.atr_lookback_tp) {
      parts.push(`ATR(${regime.atr_lookback_tp})`);
    }
    if (regime.takeprofit_timing) parts.push(regime.takeprofit_timing);
    return { text: parts.join(" · "), isEmpty: false };
  })();

  const orderSummary = (() => {
    if (!regime.order_type) return { text: "Not configured", isEmpty: true };
    const parts: string[] = [regime.order_type];
    if (
      (regime.order_type === "LIMIT" || regime.order_type === "LIMIT_ATR") &&
      regime.limit_pct
    ) {
      parts.push(`${regime.limit_pct}%`);
    }
    if (regime.order_type === "LIMIT_ATR" && regime.atr_limit_lookback) {
      parts.push(`ATR(${regime.atr_limit_lookback})`);
    }
    if (regime.max_time) parts.push(`Max time ${regime.max_time}`);
    return { text: parts.join(" · "), isEmpty: false };
  })();

  const rankingSummary = (() => {
    if (!regime.ranking) return { text: "Not configured", isEmpty: true };
    const parts: string[] = [];
    parts.push(registry[regime.ranking]?.display_name || regime.ranking);
    if (regime.ranking_lookback) parts.push(`LB ${regime.ranking_lookback}`);
    if (regime.ranking_order) parts.push(regime.ranking_order);
    if (
      regime.sector_level &&
      regime.sector_level > 0 &&
      regime.sector_limit &&
      regime.sector_limit > 0
    ) {
      parts.push(`Sector L${regime.sector_level}/max ${regime.sector_limit}`);
    }
    return { text: parts.join(" · "), isEmpty: false };
  })();

  const gapFilterSummary = (() => {
    if (!regime.gap_filter_pct || regime.gap_filter_pct === 0) {
      return { text: "Disabled", isEmpty: true };
    }
    return {
      text: `Skip entries gapping > ${regime.gap_filter_pct}%`,
      isEmpty: false,
    };
  })();

  const duplicatesSummary = (() => {
    const max = regime.max_duplicates;
    const sets = regime.max_duplicate_sets;
    if (!max && !sets) return { text: "No limit", isEmpty: true };
    const parts: string[] = [];
    if (max) parts.push(`Max ${max} per ticker`);
    if (sets) parts.push(`${sets} pairs`);
    return { text: parts.join(" · "), isEmpty: false };
  })();

  const bannedMonthsSummary = (() => {
    const months = regime.banned_months || [];
    if (months.length === 0)
      return { text: "No months excluded", isEmpty: true };
    const labels = [...months]
      .sort((a, b) => a - b)
      .map((m) => MONTH_LABELS[m - 1]);
    return {
      text: `${months.length} excluded: ${labels.join(", ")}`,
      isEmpty: false,
    };
  })();

  const tdomSummary = (() => {
    const filters = regime.tdom_filters || [];
    if (filters.length === 0) return { text: "No rules", isEmpty: true };
    return {
      text: `${filters.length} rule${filters.length === 1 ? "" : "s"} configured`,
      isEmpty: false,
    };
  })();

  const volFilterSummary = (() => {
    if (!regime.vol_filter?.enabled)
      return { text: "Disabled", isEmpty: true };
    return {
      text: `Enabled · SPY ${regime.vol_filter.spy_ticker || "spy"}`,
      isEmpty: false,
    };
  })();

  return (
    <>
      <div className="bg-white shadow-lg rounded-2xl border border-gray-300 p-6 space-y-6 hover:shadow-xl transition">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-xl font-bold text-indigo-700 tracking-wide">
            {regime.market_trend_type || regime.regime_type}
          </h3>
        </div>

        {/* Portfolio Basics — TOP BAND, full width */}
        <div className="bg-blue-50 rounded-lg p-4 border">
          <h4 className="text-lg font-bold text-blue-800 mb-3">
            📊 Portfolio Basics
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Universe */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Universe<span className="text-red-600">*</span>
              </label>

              {isIndividualEtfSimple ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">
                        {selectedEtfs.length > 0
                          ? selectedEtfs
                              .map(
                                (key) =>
                                  INDIVIDUAL_ETFS.find((etf) => etf.key === key)
                                    ?.label
                              )
                              .join(", ")
                          : "Select ETFs..."}
                      </span>
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
                      <div className="py-1">
                        {INDIVIDUAL_ETFS.map((etf) => (
                          <label
                            key={etf.key}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedEtfs.includes(etf.key)}
                              onChange={() => toggleEtf(etf.key)}
                            />
                            {etf.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={regime.universe || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, universe: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
                >
                  <option value="">-- Select Universe --</option>
                  {Object.entries(UNIVERSES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Capital */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Capital<span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={regime.capital || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, capital: +e.target.value })
                }
                placeholder="e.g. 100000"
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
              />
            </div>

            {/* Slots */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Slots<span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={regime.slots || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, slots: +e.target.value })
                }
                placeholder="e.g. 10"
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-blue-200"
              />
            </div>
          </div>
        </div>

        {/* SPLIT: Risk & Portfolio Parameters (LEFT) | Rules + Timing (RIGHT) */}
       <div className="grid grid-cols-1 lg:grid-cols-[3fr_7fr] gap-6">

          {/* ── LEFT COLUMN: Risk & Portfolio Parameters — Option B overview cards ── */}
          <div className="pt-4 border-t lg:border-t-0 lg:pt-0">
            <h4 className="text-lg font-bold text-gray-800 mb-4">
              🎯 Risk & Portfolio Parameters
            </h4>

            {/* Look Inside Bar toggle — ETF only, kept inline */}
            {config.features.lookInsideBar && (
              <label className="inline-flex items-center gap-3 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={regime.is_look_inside_bar || false}
                  onChange={(e) =>
                    onUpdate({ ...regime, is_look_inside_bar: e.target.checked })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
                />
                <div>
                  <span className="text-sm font-bold text-gray-700">
                    Look Inside Bar
                  </span>
                  <p className="text-xs text-gray-500">
                    When enabled, stoploss and takeprofit are evaluated on
                    minute-bar data. When disabled, they use daily bar data only.
                  </p>
                </div>
              </label>
            )}

            {/* Close-positions-on-regime-exit toggle — relevant when multiple regimes exist */}
            {config.features.marketTrendRules && (
              <label className="inline-flex items-center gap-3 mb-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={regime.close_positions_on_regime_exit || false}
                  onChange={(e) =>
                    onUpdate({ ...regime, close_positions_on_regime_exit: e.target.checked })
                  }
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-300"
                />
                <div>
                  <span className="text-sm font-bold text-gray-700">
                    Close positions when this regime ends
                  </span>
                  <p className="text-xs text-gray-500">
                    When enabled, open positions in this regime are force-closed
                    at next open when the market trend shifts away. When disabled,
                    positions exit normally via exit signals / stop loss even
                    after regime switches.
                  </p>
                </div>
              </label>
            )}

            <div className="space-y-2">
              <RiskOverviewCard
                label="Stoploss"
                summary={stoplossSummary.text}
                isEmpty={stoplossSummary.isEmpty}
                onEdit={() => setActiveEditor("stoploss")}
              />
              <RiskOverviewCard
                label="Takeprofit"
                summary={takeprofitSummary.text}
                isEmpty={takeprofitSummary.isEmpty}
                onEdit={() => setActiveEditor("takeprofit")}
              />
              <RiskOverviewCard
                label="Order Settings"
                summary={orderSummary.text}
                isEmpty={orderSummary.isEmpty}
                onEdit={() => setActiveEditor("order")}
              />
              {config.features.ranking && (
                <RiskOverviewCard
                  label="Ranking"
                  summary={rankingSummary.text}
                  isEmpty={rankingSummary.isEmpty}
                  onEdit={() => setActiveEditor("ranking")}
                />
              )}
              <RiskOverviewCard
                label="Gap Filter"
                summary={gapFilterSummary.text}
                isEmpty={gapFilterSummary.isEmpty}
                onEdit={() => setActiveEditor("gap_filter")}
              />
              <RiskOverviewCard
                label="Duplicate Positions"
                summary={duplicatesSummary.text}
                isEmpty={duplicatesSummary.isEmpty}
                onEdit={() => setActiveEditor("duplicates")}
              />
              <RiskOverviewCard
                label="Banned Months"
                summary={bannedMonthsSummary.text}
                isEmpty={bannedMonthsSummary.isEmpty}
                onEdit={() => setActiveEditor("banned_months")}
              />
              <RiskOverviewCard
                label="TDOM Filters"
                summary={tdomSummary.text}
                isEmpty={tdomSummary.isEmpty}
                onEdit={() => setActiveEditor("tdom")}
              />
              <RiskOverviewCard
                label="Vol / Turnover Filter"
                summary={volFilterSummary.text}
                isEmpty={volFilterSummary.isEmpty}
                onEdit={() => setActiveEditor("vol_filter")}
              />
            </div>
          </div>

          {/* ── RIGHT COLUMN: Rules + Timing — unchanged from previous version ── */}
          <div className="pt-4 border-t lg:border-t-0 lg:pt-0">
            <h4 className="text-lg font-bold text-gray-800 mb-4">Rules</h4>

            <div className="space-y-3">

                            {/* Market Trend Rules overview — conditional */}
              {config.features.marketTrendRules &&
                (() => {
                  const s = summarizeTree(marketTrendRulesTree);
                  const isEmpty = s.count === 0;
                  return (
                    <div className="bg-indigo-50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h5 className="text-sm font-bold text-indigo-800">
                          📈 Market Trend Rules
                          {regime.market_trend_type && (
                            <span className="ml-2 text-xs font-normal text-indigo-700">
                              ({regime.market_trend_type})
                            </span>
                          )}
                        </h5>
                        <button
                          type="button"
                          onClick={() => setActiveEditor("market_trend")}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition whitespace-nowrap"
                        >
                          {isEmpty ? "+ Add" : "✏ Edit"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {isEmpty
                          ? "No rules configured"
                          : `${s.count} rule${s.count === 1 ? "" : "s"} · ${s.logic}`}
                      </p>
                      {!isEmpty && (
                        <div className="bg-white rounded px-2 py-2 border border-indigo-100">
                          <RulePillsDisplay tree={marketTrendRulesTree} />
                        </div>
                      )}
                    </div>
                  );
                })()}

{/* Safety Nets overview (list of stateful policies) */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-yellow-800">
                        🛡 Safety Nets
                      </h5>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-yellow-100 text-yellow-900">
                        {safetyNets.length === 0 ? "none" : `${safetyNets.length} active`}
                      </span>
                    </div>
                    <p className="text-xs text-yellow-900/70 mt-0.5">
                      All checks run each day — any one says freeze, the strategy freezes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveEditor("safety_net")}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition whitespace-nowrap shrink-0"
                  >
                    ✏ Edit
                  </button>
                </div>
                {safetyNets.length === 0 ? (
                  <p className="text-xs text-gray-700 italic">
                    No safety nets. The strategy trades freely regardless of market conditions.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 mt-1">
                    {safetyNets.map((sn, idx) => {
                      const label = SAFETY_NET_TYPES[sn.type] || sn.type;
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-yellow-900/60 w-4">{idx + 1}</span>
                          <span className="font-semibold px-2 py-0.5 rounded bg-yellow-200/60 text-yellow-900 uppercase tracking-wide">
                            {sn.type}
                          </span>
                          <span className="text-gray-700 truncate">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Entry Rules overview */}
              {(() => {
                const s = summarizeTree(entryTree);
                const isEmpty = s.count === 0;
                return (
                  <div className="bg-green-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h5 className="text-sm font-bold text-green-800">
                        ✅ Entry Rules
                      </h5>
                      <button
                        type="button"
                        onClick={() => setActiveEditor("entry")}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition whitespace-nowrap"
                      >
                        {isEmpty ? "+ Add" : "✏ Edit"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      {isEmpty
                        ? "No rules configured"
                        : `${s.count} rule${s.count === 1 ? "" : "s"} · ${s.logic}`}
                    </p>
                    {!isEmpty && (
                      <div className="bg-white rounded px-2 py-2 border border-green-100">
                        <RulePillsDisplay tree={entryTree} universe={regime.universe} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Exit Rules overview */}
              {(() => {
                const s = summarizeTree(exitTree);
                const isEmpty = s.count === 0;
                return (
                  <div className="bg-red-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h5 className="text-sm font-bold text-red-800">
                        ❌ Exit Rules
                      </h5>
                      <button
                        type="button"
                        onClick={() => setActiveEditor("exit")}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition whitespace-nowrap"
                      >
                        {isEmpty ? "+ Add" : "✏ Edit"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">
                      {isEmpty
                        ? "No rules configured"
                        : `${s.count} rule${s.count === 1 ? "" : "s"} · ${s.logic}`}
                    </p>
                    {!isEmpty && (
                      <div className="bg-white rounded px-2 py-2 border border-red-100">
                        <RulePillsDisplay tree={exitTree} universe={regime.universe} />
                      </div>
                    )}
                  </div>
                );
              })()}



              {/* Entry/Exit Timing — single row */}
              <div className="bg-blue-50 rounded-lg px-3 py-2.5 border">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-blue-800 shrink-0">
                    ⏱ Timing
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <label className="text-xs font-medium text-gray-600 shrink-0">
                      Entry<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={regime.entry_timing || ""}
                      onChange={(e) =>
                        onUpdate({ ...regime, entry_timing: e.target.value })
                      }
                      className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-md focus:ring focus:ring-blue-200 bg-white"
                    >
                      <option value="">-- Select --</option>
                      {Object.entries(SIGNAL_TIMING).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-px h-4 bg-blue-200 shrink-0" />
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <label className="text-xs font-medium text-gray-600 shrink-0">
                      Exit<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={regime.exit_timing || ""}
                      onChange={(e) =>
                        onUpdate({ ...regime, exit_timing: e.target.value })
                      }
                      className="flex-1 min-w-0 px-2 py-1 text-xs border rounded-md focus:ring focus:ring-blue-200 bg-white"
                    >
                      <option value="">-- Select --</option>
                      {Object.entries(SIGNAL_TIMING).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor modal — hosts rule editors AND risk param editors */}
      <RuleEditorModal
        open={activeEditor !== null}
        title={modalConfig.title}
        subtitle={modalSubtitle}
        maxWidth={modalConfig.maxWidth}
        onClose={closeModal}
      >
        {/* ── Rule editors ── */}
        {activeEditor === "entry" && (
          <RulesTreeEditor
            key="entry-editor"
            label="✅ Entry Rules"
            tree={entryTree}
            onChange={setEntryTree}
            indicators={indicatorsFor(regime.regime_type, "entry", "lhs")}
            marketIndicators={indicatorsFor(regime.regime_type, "entry", "rhs")}
          />
        )}
        {activeEditor === "exit" && (
          <RulesTreeEditor
            key="exit-editor"
            label="❌ Exit Rules"
            tree={exitTree}
            onChange={setExitTree}
            indicators={indicatorsFor(regime.regime_type, "entry", "lhs")}
            marketIndicators={indicatorsFor(regime.regime_type, "entry", "rhs")}
          />
        )}
        {activeEditor === "market_trend" && (
          <RulesTreeEditor
            key="market-rules-editor"
            label=" 📈 Market Trend Rules"
            tree={marketTrendRulesTree}
            onChange={setMarketTrendRulesTree}
            indicators={indicatorsFor(regime.regime_type, "market_regime", "lhs")}
            marketIndicators={indicatorsFor(regime.regime_type, "market_regime", "lhs")}
            tickerOptions={INDEX_TICKERS}
          />
        )}
{activeEditor === "safety_net" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add as many safety nets as you need. Each runs every day; any one
              saying freeze stops trading.
            </p>

            {/* List of safety-net items */}
            <div className="flex flex-col gap-3">
              {safetyNets.length === 0 && (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-sm text-gray-600 italic">
                    No safety nets configured. Click "Add safety net" below.
                  </p>
                </div>
              )}

              {safetyNets.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-yellow-50/50 border border-yellow-200 rounded-lg p-4"
                >
                  {/* Item header — number badge, type dropdown, remove */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-yellow-200 text-yellow-900 text-sm font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <select
                      value={item.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        // When changing type, swap default params for the new type
                        const newParams = newType === "simple"
                          ? { freeze_rules_tree: makeEmptyTree(),
                              resume_rules_tree: makeEmptyTree(),
                              freeze_timing: "open",
                              resume_timing: "open" }
                          : {};
                        setSafetyNets((prev) =>
                          prev.map((sn, i) =>
                            i === idx ? { type: newType, params: newParams } : sn
                          )
                        );
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring focus:ring-indigo-200"
                    >
                      {Object.entries(SAFETY_NET_TYPES)
                        .filter(([k]) => k !== "none")
                        .map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setSafetyNets((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="px-2 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition shrink-0"
                      title="Remove this safety net"
                    >
                      🗑
                    </button>
                  </div>

                  {/* Item body — conditional on type */}
                  {item.type === "simple" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Freeze Timing
                          </label>
                          <select
                            value={item.params.freeze_timing || "open"}
                            onChange={(e) =>
                              setSafetyNets((prev) =>
                                prev.map((sn, i) =>
                                  i === idx
                                    ? { ...sn, params: { ...sn.params, freeze_timing: e.target.value } }
                                    : sn
                                )
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                          >
                            <option value="open">Open (decide yesterday, act today open)</option>
                            <option value="close">Close (decide today, act today close)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Resume Timing
                          </label>
                          <select
                            value={item.params.resume_timing || "open"}
                            onChange={(e) =>
                              setSafetyNets((prev) =>
                                prev.map((sn, i) =>
                                  i === idx
                                    ? { ...sn, params: { ...sn.params, resume_timing: e.target.value } }
                                    : sn
                                )
                              )
                            }
                            className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                          >
                            <option value="open">Open (decide yesterday, act today open)</option>
                            <option value="close">Close (decide today, act today close)</option>
                          </select>
                        </div>
                      </div>

                      <RulesTreeEditor
                        key={`freeze-${idx}`}
                        label="Freeze Trading Rules"
                        tree={item.params.freeze_rules_tree ?? makeEmptyTree()}
                        onChange={(newTree) =>
                          setSafetyNets((prev) =>
                            prev.map((sn, i) =>
                              i === idx
                                ? { ...sn, params: { ...sn.params, freeze_rules_tree: newTree } }
                                : sn
                            )
                          )
                        }
                        indicators={indicatorsFor(regime.regime_type, "volatility", "lhs")}
                        marketIndicators={indicatorsFor(regime.regime_type, "volatility", "lhs")}
                        tickerOptions={INDEX_TICKERS}
                      />
                      <RulesTreeEditor
                        key={`resume-${idx}`}
                        label="Resume Trading Rules"
                        tree={item.params.resume_rules_tree ?? makeEmptyTree()}
                        onChange={(newTree) =>
                          setSafetyNets((prev) =>
                            prev.map((sn, i) =>
                              i === idx
                                ? { ...sn, params: { ...sn.params, resume_rules_tree: newTree } }
                                : sn
                            )
                          )
                        }
                        indicators={indicatorsFor(regime.regime_type, "volatility", "lhs")}
                        marketIndicators={indicatorsFor(regime.regime_type, "volatility", "lhs")}
                        tickerOptions={INDEX_TICKERS}
                      />
                    </div>
                  )}

                  {item.type === "spy_volatility" && (() => {
                    // Default values match Python L_SMR_STATIC.
                    // The engine has the same defaults; these are just UI fallbacks for fresh items.
                    const p = item.params || {};
                    const setParam = (k: string, v: any) =>
                      setSafetyNets((prev) =>
                        prev.map((sn, i) =>
                          i === idx ? { ...sn, params: { ...sn.params, [k]: v } } : sn
                        )
                      );
                    return (
                      <div className="space-y-4">

                        {/* Detection group */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Detection
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Vol ticker</label>
                              <input
                                type="text"
                                value={p.vol_ticker ?? "SPY"}
                                onChange={(e) => setParam("vol_ticker", e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Vol lookback (days)</label>
                              <input
                                type="number"
                                step={1}
                                min={2}
                                value={p.vol_lookback ?? 5}
                                onChange={(e) => setParam("vol_lookback", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Vol threshold</label>
                              <input
                                type="number"
                                step={0.001}
                                value={p.vol_threshold ?? 0.025}
                                onChange={(e) => setParam("vol_threshold", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Escape routes group */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Escape routes
                          </p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Timeout (days)</label>
                              <input
                                type="number"
                                step={1}
                                min={1}
                                value={p.timeout_days ?? 20}
                                onChange={(e) => setParam("timeout_days", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Selloff pct</label>
                              <input
                                type="number"
                                step={0.01}
                                min={0}
                                max={1}
                                value={p.selloff_pct ?? 0.20}
                                onChange={(e) => setParam("selloff_pct", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Peak drop pct</label>
                              <input
                                type="number"
                                step={0.01}
                                min={0}
                                max={1}
                                value={p.peak_drop_pct ?? 0.80}
                                onChange={(e) => setParam("peak_drop_pct", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Re-entry group */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Re-entry
                          </p>
                          <div className="grid grid-cols-3 gap-3 items-start">
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Re-arm pct</label>
                              <input
                                type="number"
                                step={0.01}
                                min={0}
                                max={1}
                                value={p.rearm_pct ?? 0.80}
                                onChange={(e) => setParam("rearm_pct", Number(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200"
                              />
                            </div>
                            <div className="col-span-2 pt-1">
                              <label className="inline-flex items-start gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!p.close_on_rearm}
                                  onChange={(e) => setParam("close_on_rearm", e.target.checked)}
                                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-300"
                                />
                                <span className="text-xs text-gray-700">
                                  <span className="font-semibold">Close positions on re-arm</span>
                                  <br />
                                  <span className="text-gray-600">
                                    More aggressive — diverges from Python default. Off keeps positions, they exit via RSI/stop-loss.
                                  </span>
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                  {item.type === "spy_volatility_pause" && (() => {
                    const p = item.params || {};
                    const setParam = (k: string, v: any) =>
                      setSafetyNets((prev) =>
                        prev.map((sn, i) =>
                          i === idx ? { ...sn, params: { ...sn.params, [k]: v } } : sn
                        )
                      );
                    return (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-600 italic">
                          Pause new entries when SPY vol exceeds <code>multiple × rolling median of vol</code>.
                          Existing positions are NOT closed — they exit via normal rules.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Vol ticker</label>
                            <input type="text"
                              value={p.vol_ticker ?? "SPY"}
                              onChange={(e) => setParam("vol_ticker", e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Vol lookback (days)</label>
                            <input type="number" step={1} min={2}
                              value={p.vol_lookback ?? 20}
                              onChange={(e) => setParam("vol_lookback", Number(e.target.value))}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Median lookback (days)</label>
                            <input type="number" step={1} min={20}
                              value={p.vol_median_lookback ?? 252}
                              onChange={(e) => setParam("vol_median_lookback", Number(e.target.value))}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-700 mb-1">Multiple</label>
                            <input type="number" step={0.1} min={0.5}
                              value={p.vol_multiple ?? 2.0}
                              onChange={(e) => setParam("vol_multiple", Number(e.target.value))}
                              className="w-full px-2 py-1.5 text-sm border rounded focus:ring focus:ring-yellow-200" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              ))}
            </div>

            {/* Add button */}
            <button
              type="button"
              onClick={() =>
                setSafetyNets((prev) => [
                  ...prev,
                  {
                    type: "simple",
                    params: {
                      freeze_rules_tree: makeEmptyTree(),
                      resume_rules_tree: makeEmptyTree(),
                      freeze_timing: "open",
                      resume_timing: "open",
                    },
                  },
                ])
              }
              className="w-full px-4 py-3 text-sm border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition"
            >
              + Add safety net
            </button>
          </div>
        )}

        {/* ── Risk param editors — lifted from inline cards, verbatim markup ── */}

        {activeEditor === "stoploss" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Stoploss Type
              </label>
              <select
                value={regime.stoploss_type || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, stoploss_type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(STOPLOSS_TYPE).map(([key, label]) => (
                  <option key={key} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {regime.stoploss_type !== "DOLLAR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stoploss %
                </label>
                <input
                  type="number"
                  value={regime.stoploss_pct || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, stoploss_pct: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-red-200"
                  placeholder="e.g. 5"
                />
              </div>
            )}

            {regime.stoploss_type === "DOLLAR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stoploss Dollar
                </label>
                <input
                  type="number"
                  value={regime.stoploss_dollar || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, stoploss_dollar: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-red-200"
                  placeholder="e.g. 5"
                />
              </div>
            )}

            {regime.stoploss_type === "ATR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ATR Lookback (Stoploss)
                </label>
                <input
                  type="number"
                  value={regime.atr_lookback_stp || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      atr_lookback_stp: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-red-200"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Stoploss Timing
              </label>
              <select
                value={regime.stoploss_timing || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, stoploss_timing: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(RISK_TIMING)
                  .filter(
                    ([key]) =>
                      config.features.intradayTiming || key !== "intraday"
                  )
                  .map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {activeEditor === "takeprofit" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Takeprofit Type
              </label>
              <select
                value={regime.takeprofit_type || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, takeprofit_type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(TAKEPROFIT_TYPE).map(([key, label]) => (
                  <option key={key} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {regime.takeprofit_type !== "DOLLAR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Takeprofit %
                </label>
                <input
                  type="number"
                  value={regime.takeprofit_pct || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, takeprofit_pct: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-green-200"
                  placeholder="e.g. 15"
                />
              </div>
            )}

            {regime.takeprofit_type == "DOLLAR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Takeprofit Dollar Amount
                </label>
                <input
                  type="number"
                  value={regime.takeprofit_dollar || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      takeprofit_dollar: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-green-200"
                  placeholder="e.g. 15"
                />
              </div>
            )}

            {regime.takeprofit_type === "ATR_BASED" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ATR Lookback (Takeprofit)
                </label>
                <input
                  type="number"
                  value={regime.atr_lookback_tp || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      atr_lookback_tp: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-green-200"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Takeprofit Timing
              </label>
              <select
                value={regime.takeprofit_timing || ""}
                onChange={(e) =>
                  onUpdate({
                    ...regime,
                    takeprofit_timing: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(RISK_TIMING)
                  .filter(
                    ([key]) =>
                      config.features.intradayTiming || key !== "intraday"
                  )
                  .map(([key, label]) => (
                    <option key={key} value={label}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {activeEditor === "order" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Order Type <span className="text-red-600">*</span>
              </label>

              <select
                value={regime.order_type || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, order_type: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(ORDER_TYPE).map(([key, label]) => (
                  <option key={key} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {(regime.order_type === "LIMIT" ||
              regime.order_type === "LIMIT_ATR") && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Limit %
                </label>
                <input
                  type="number"
                  value={regime.limit_pct || ""}
                  onChange={(e) =>
                    onUpdate({ ...regime, limit_pct: +e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>
            )}

            {regime.order_type === "LIMIT_ATR" && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ATR Lookback (Limit)
                </label>
                <input
                  type="number"
                  value={regime.atr_limit_lookback || ""}
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      atr_limit_lookback: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Max Time
              </label>
              <input
                type="number"
                value={regime.max_time || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, max_time: +e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              />
            </div>
          </div>
        )}

        {activeEditor === "ranking" && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ranking Indicator <span className="text-red-600">*</span>
              </label>
              <select
                value={regime.ranking || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, ranking: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(indicatorsFor(regime.regime_type, "ranking", "lhs")).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ranking Lookback<span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={regime.ranking_lookback || ""}
                onChange={(e) =>
                  onUpdate({
                    ...regime,
                    ranking_lookback: +e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ranking Order<span className="text-red-600">*</span>
              </label>
              <select
                value={regime.ranking_order || ""}
                onChange={(e) =>
                  onUpdate({ ...regime, ranking_order: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              >
                <option value="">-- Select --</option>
                {Object.entries(RANKING_ORDERS).map(([key, label]) => (
                  <option key={key} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Sector Level
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={regime.sector_level || ""}
                  placeholder="0 = disabled"
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      sector_level: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Max Per Sector
                </label>
                <input
                  type="number"
                  min={0}
                  value={regime.sector_limit || ""}
                  placeholder="0 = disabled"
                  onChange={(e) =>
                    onUpdate({
                      ...regime,
                      sector_limit: +e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>
        )}

        {activeEditor === "gap_filter" && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Max Gap % (skip entries gapping beyond this %)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={regime.gap_filter_pct || ""}
              placeholder="0 = disabled"
              onChange={(e) =>
                onUpdate({
                  ...regime,
                  gap_filter_pct: +e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
            />
          </div>
        )}

        {activeEditor === "duplicates" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Max Per Ticker
              </label>
              <input
                type="number"
                min={0}
                value={regime.max_duplicates || ""}
                placeholder="1 = no duplicates"
                onChange={(e) =>
                  onUpdate({
                    ...regime,
                    max_duplicates: +e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Max Duplicate Pairs
              </label>
              <input
                type="number"
                min={0}
                value={regime.max_duplicate_sets || ""}
                placeholder="0 = no limit"
                onChange={(e) =>
                  onUpdate({
                    ...regime,
                    max_duplicate_sets: +e.target.value,
                  })
                }
                className="w-full px-3 py-2 border rounded-lg text-base focus:ring focus:ring-indigo-200"
              />
            </div>
          </div>
        )}

        {activeEditor === "banned_months" && (
          <div>
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-2 text-center">
              {MONTH_LABELS.map((label, idx) => {
                const monthNum = idx + 1;
                const isBanned =
                  regime.banned_months?.includes(monthNum) || false;

                return (
                  <button
                    key={label}
                    onClick={() => {
                      const newMonths = isBanned
                        ? (regime.banned_months || []).filter(
                            (m) => m !== monthNum
                          )
                        : [...(regime.banned_months || []), monthNum];
                      onUpdate({ ...regime, banned_months: newMonths });
                    }}
                    className={`text-xs sm:text-sm font-medium px-2.5 py-1.5 rounded-full border transition 
            ${
              isBanned
                ? "bg-red-100 border-red-400 text-red-700 hover:bg-red-200"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center">
              Click months to{" "}
              <span className="font-semibold text-red-600">exclude</span> from
              trading.
            </p>
          </div>
        )}

        {activeEditor === "tdom" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-gray-500">
                Block entries on a specific trading-day-of-month position or
                weekday, for selected months only.
              </p>
              <button
                onClick={() =>
                  onUpdate({
                    ...regime,
                    tdom_filters: [
                      ...(regime.tdom_filters || []),
                      { banned_months: [] },
                    ],
                  })
                }
                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition whitespace-nowrap ml-3"
              >
                + Add Rule
              </button>
            </div>

            {(!regime.tdom_filters || regime.tdom_filters.length === 0) && (
              <p className="text-xs text-gray-400 italic text-center py-2">
                No TDOM filter rules. Click "+ Add Rule" to create one.
              </p>
            )}

            {(regime.tdom_filters || []).map(
              (filter: TdomFilter, fi: number) => {
                const selectValue =
                  filter.tdom != null
                    ? `tdom_${filter.tdom}`
                    : filter.weekday != null
                    ? `wd_${filter.weekday}`
                    : "";

                const handleTypeChange = (val: string) => {
                  const updated = [...(regime.tdom_filters || [])];
                  if (val.startsWith("tdom_")) {
                    const n = parseInt(val.split("_")[1], 10);
                    updated[fi] = {
                      banned_months: filter.banned_months,
                      tdom: n,
                    };
                  } else if (val.startsWith("wd_")) {
                    const n = parseInt(val.split("_")[1], 10);
                    updated[fi] = {
                      banned_months: filter.banned_months,
                      weekday: n,
                    };
                  } else {
                    updated[fi] = { banned_months: filter.banned_months };
                  }
                  onUpdate({ ...regime, tdom_filters: updated });
                };

                const handleMonthToggle = (monthNum: number) => {
                  const updated = [...(regime.tdom_filters || [])];
                  const already = filter.banned_months.includes(monthNum);
                  updated[fi] = {
                    ...filter,
                    banned_months: already
                      ? filter.banned_months.filter((m) => m !== monthNum)
                      : [...filter.banned_months, monthNum],
                  };
                  onUpdate({ ...regime, tdom_filters: updated });
                };

                const handleRemove = () => {
                  const updated = (regime.tdom_filters || []).filter(
                    (_, i) => i !== fi
                  );
                  onUpdate({ ...regime, tdom_filters: updated });
                };

                return (
                  <div
                    key={fi}
                    className="mb-3 p-3 bg-gray-50 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-semibold text-gray-500 w-16 shrink-0">
                        Rule {fi + 1}
                      </span>

                      <select
                        value={selectValue}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="text-sm border rounded-lg px-2 py-1.5 bg-white focus:ring focus:ring-indigo-200 flex-1 min-w-0"
                      >
                        <option value="">-- Select day type --</option>
                        <optgroup label="Trading Day of Month (0-based)">
                          {TDOM_LABELS.map((label, n) => (
                            <option key={`tdom_${n}`} value={`tdom_${n}`}>
                              {label} trading day of month (TDOM {n})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Day of Week">
                          {WD_LABELS.map((label, n) => (
                            <option key={`wd_${n}`} value={`wd_${n}`}>
                              Every {label} (weekday {n})
                            </option>
                          ))}
                        </optgroup>
                      </select>

                      <button
                        onClick={handleRemove}
                        className="text-red-400 hover:text-red-600 text-xl font-bold leading-none shrink-0"
                        title="Remove rule"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1 pl-16">
                      {MONTH_LABELS.map((label, idx) => {
                        const monthNum = idx + 1;
                        const active =
                          filter.banned_months.includes(monthNum);
                        return (
                          <button
                            key={label}
                            onClick={() => handleMonthToggle(monthNum)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border transition
                            ${
                              active
                                ? "bg-red-100 border-red-400 text-red-700 hover:bg-red-200"
                                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {selectValue && filter.banned_months.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2 pl-16">
                        Block entries on{" "}
                        <span className="font-semibold text-gray-700">
                          {selectValue.startsWith("tdom_")
                            ? `${
                                TDOM_LABELS[
                                  parseInt(selectValue.split("_")[1], 10)
                                ]
                              } trading day`
                            : `every ${
                                WD_LABELS[
                                  parseInt(selectValue.split("_")[1], 10)
                                ]
                              }`}{" "}
                          in{" "}
                          {filter.banned_months
                            .sort((a, b) => a - b)
                            .map((m) => MONTH_LABELS[m - 1])
                            .join(", ")}
                        </span>
                      </p>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {activeEditor === "vol_filter" && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-gray-500">
                Yearly-recalculated universe-wide percentile thresholds. Entries
                below the threshold are excluded. Triggered on the 1st January
                trading day each year.
              </p>
              <label className="flex items-center gap-2 cursor-pointer select-none ml-3 shrink-0">
                <span className="text-sm text-gray-600">
                  {regime.vol_filter?.enabled ? "Enabled" : "Disabled"}
                </span>
                <div
                  onClick={() => {
                    const current = regime.vol_filter;
                    const next: VolFilter = current?.enabled
                      ? { ...current, enabled: false }
                      : {
                          enabled: true,
                          spy_ticker: current?.spy_ticker ?? "spy",
                          vol_pct_bull: current?.vol_pct_bull ?? 0.2,
                          vol_pct_bear: current?.vol_pct_bear ?? 0.45,
                          turnover_pct_bull: current?.turnover_pct_bull ?? 0.35,
                          turnover_pct_bear: current?.turnover_pct_bear ?? 0.05,
                        };
                    onUpdate({ ...regime, vol_filter: next });
                  }}
                  className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex items-center px-1
                    ${regime.vol_filter?.enabled ? "bg-indigo-600" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow transition-transform
                      ${regime.vol_filter?.enabled ? "translate-x-5" : "translate-x-0"}`}
                  />
                </div>
              </label>
            </div>

            {regime.vol_filter?.enabled && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 w-32 shrink-0">
                    SPY Ticker
                  </label>
                  <input
                    type="text"
                    value={regime.vol_filter?.spy_ticker ?? "spy"}
                    onChange={(e) =>
                      onUpdate({
                        ...regime,
                        vol_filter: {
                          ...(regime.vol_filter as VolFilter),
                          spy_ticker: e.target.value,
                        },
                      })
                    }
                    className="text-sm border rounded-lg px-2 py-1.5 w-28 focus:ring focus:ring-indigo-200"
                    placeholder="spy"
                  />
                  <span className="text-xs text-gray-400">
                    Used to compute SMA(200) for bull/bear regime detection
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Volume — Bull (SPY &gt; SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={regime.vol_filter?.vol_pct_bull ?? 0.2}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: {
                              ...(regime.vol_filter as VolFilter),
                              vol_pct_bull: +e.target.value,
                            },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">
                        bottom fraction excluded
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Volume — Bear (SPY ≤ SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={regime.vol_filter?.vol_pct_bear ?? 0.45}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: {
                              ...(regime.vol_filter as VolFilter),
                              vol_pct_bear: +e.target.value,
                            },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">
                        bottom fraction excluded
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Turnover — Bull (SPY &gt; SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={regime.vol_filter?.turnover_pct_bull ?? 0.35}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: {
                              ...(regime.vol_filter as VolFilter),
                              turnover_pct_bull: +e.target.value,
                            },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">
                        bottom fraction excluded
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Turnover — Bear (SPY ≤ SMA200)
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={regime.vol_filter?.turnover_pct_bear ?? 0.05}
                        onChange={(e) =>
                          onUpdate({
                            ...regime,
                            vol_filter: {
                              ...(regime.vol_filter as VolFilter),
                              turnover_pct_bear: +e.target.value,
                            },
                          })
                        }
                        className="text-sm border rounded-lg px-2 py-1.5 w-24 focus:ring focus:ring-indigo-200"
                      />
                      <span className="text-xs text-gray-400">
                        bottom fraction excluded
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 pt-1 border-t mt-2">
                  CRDT_1 defaults: Vol bull=0.20, bear=0.45 · Turnover bull=0.35,
                  bear=0.05
                </p>
              </div>
            )}
          </div>
        )}
      </RuleEditorModal>
    </>
  );
};

export default RegimeCard;