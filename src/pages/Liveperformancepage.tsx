/**
 * LivePerformancePage — live execution equity, performance & substitution analysis.
 *
 * Route: /execution/live-performance
 * Section: Live Execution on MainPage
 *
 * Panels:
 *  1. Key metric stat cards (total return, P&L, win rate, drawdown, hold days)
 *  2. Yearly returns + monthly returns heatmap + monthly trades heatmap
 *     (same MonthlyHeatmap component / colour scheme as PerformanceTab)
 *  3. Equity curve (P&L offset from production_capital, same as backtest)
 *     + high-watermark reference line + drawdown area below
 *  4. Closed trades table
 *  5. Substitution scorecard with cumulative summary
 */

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Plot from "react-plotly.js";
import {
  fetchExecutionEnabledStrategies,
  ExecutionEnabledStrategy,
} from "../services/tradelistService.ts";
import API from "../config/api.ts";
import { MONTH_LABELS } from "../constants/uiConstants.ts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EquityPoint {
  date: string;
  equity_offset: number | null;
  equity: number | null;
  unrealised_pnl: number | null;
  unrealised_pct: number | null;
  drawdown_offset: number | null;
  drawdown_pct: number | null;
  max_equity_offset: number | null;
  deployed_capital: number | null;
  unused_capital: number | null;
  open_position_count: number;
}

interface ClosedTrade {
  id: number;
  symbol: string;
  direction: string;
  entry_date: string | null;
  exit_date: string | null;
  entry_price: number | null;
  exit_price: number | null;
  filled_qty: number | null;
  profit: number | null;
  profit_pct: number | null;
  day_count: number | null;
  exit_reason: string | null;
}

interface MonthlyRow {
  year: number;
  months: (number | null)[];
  total: number | null;
}

interface YearlyReturn {
  year: number;
  pnl: number;
  pnl_pct: number | null;
  trades: number;
  win_rate: number;
}

interface Metrics {
  production_capital: number;
  total_return_pct: number;
  current_equity: number;
  max_drawdown_pct: number;
  current_drawdown_pct: number;
  win_rate_pct: number;
  avg_hold_days: number;
  total_closed_pnl: number;
  profit_factor: number | null;
  total_trades: number;
}

interface LivePerf {
  equity_series: EquityPoint[];
  closed_trades: ClosedTrade[];
  monthly_returns: MonthlyRow[];
  monthly_trades: MonthlyRow[];
  yearly_returns: YearlyReturn[];
  metrics: Metrics;
}

interface ScorecardRow {
  date: string | null;
  action: string;
  original_symbol: string;
  substitute_symbol: string | null;
  status: "open" | "closed";
  system_pnl: number | null;
  system_pnl_pct: number | null;
  actual_pnl: number | null;
  actual_pnl_pct: number | null;
  actual_qty: number | null;
  difference_pnl: number;
  reason_for_action: string | null;
}

interface ScorecardResponse {
  rows: ScorecardRow[];
  summary: {
    total_system_pnl: number;
    total_actual_pnl: number;
    total_difference: number;
    decisions: number;
    better_count: number;
    worse_count: number;
  };
}

// ── Colour helpers (same as PerformanceTab) ───────────────────────────────────

type RGB = [number, number, number];
const WHITE:  RGB = [255, 255, 255];
const GREEN:  RGB = [22, 163, 74];
const RED:    RGB = [220, 38, 38];
const INDIGO: RGB = [79, 70, 229];
const CAP = 0.85;

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
function mix(a: RGB, b: RGB, t: number): RGB {
  const k = clamp01(t);
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}
const rgb = ([r, g, b]: RGB) => `rgb(${r},${g},${b})`;

function divergingBg(v: number, maxAbs: number): RGB {
  if (!maxAbs) return WHITE;
  const t = clamp01(Math.abs(v) / maxAbs) * CAP;
  return v >= 0 ? mix(WHITE, GREEN, t) : mix(WHITE, RED, t);
}
function sequentialBg(v: number, maxVal: number): RGB {
  if (!maxVal || v <= 0) return WHITE;
  return mix(WHITE, INDIGO, clamp01(v / maxVal) * CAP);
}
function textOn([r, g, b]: RGB): string {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#111827" : "#ffffff";
}

// ── MonthlyHeatmap (identical to PerformanceTab) ──────────────────────────────

type HeatMode = "returns" | "trades";

const MonthlyHeatmap: React.FC<{ mode: HeatMode; rows: MonthlyRow[] }> = ({ mode, rows }) => {
  if (!rows || rows.length === 0)
    return <p className="italic text-gray-500 text-sm">No monthly data yet.</p>;

  const isReturns = mode === "returns";
  let maxAbsMonth = 0, maxAbsTotal = 0;
  for (const r of rows) {
    for (const v of r.months) if (v != null) maxAbsMonth = Math.max(maxAbsMonth, Math.abs(v));
    if (r.total != null) maxAbsTotal = Math.max(maxAbsTotal, Math.abs(r.total));
  }
  const cellBg = (v: number, isTotal: boolean): RGB => {
    const scale = isTotal ? maxAbsTotal : maxAbsMonth;
    return isReturns ? divergingBg(v, scale) : sequentialBg(v, scale);
  };
  const fmt = (v: number) => (isReturns ? v.toFixed(2) : String(v));
  const renderCell = (v: number | null, key: React.Key, isTotal: boolean) => {
    const edge = isTotal ? "border-l border-gray-300 font-semibold" : "";
    if (v == null)
      return <td key={key} className={`px-2 py-1 text-gray-300 bg-gray-50 text-center ${edge}`}>·</td>;
    const bg = cellBg(v, isTotal);
    return (
      <td key={key} className={`px-2 py-1 text-center ${edge}`}
        style={{ backgroundColor: rgb(bg), color: textOn(bg), fontVariantNumeric: "tabular-nums" }}>
        {fmt(v)}
      </td>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm whitespace-nowrap border-collapse">
        <thead className="bg-gray-100 uppercase text-xs tracking-wide text-gray-700">
          <tr>
            <th className="px-2 py-1 text-left sticky left-0 bg-gray-100 z-10">Year</th>
            {MONTH_LABELS.map((m) => <th key={m} className="px-2 py-1">{m}</th>)}
            <th className="px-2 py-1 border-l border-gray-300">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <td className="px-2 py-1 font-medium text-left sticky left-0 bg-white z-10">{r.year}</td>
              {r.months.map((v, i) => renderCell(v, `m${i}`, false))}
              {renderCell(r.total, "total", true)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtPnl = (v: number | null | undefined, prefix = "£") =>
  v == null ? "—" : `${v >= 0 ? "+" : "-"}${prefix}${Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
const fmtPct = (v: number | null | undefined) =>
  v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
const fmt2 = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(2));
const pnlCls = (v: number | null | undefined) =>
  v == null ? "text-gray-400" : v >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold";

const ACTION_META: Record<string, { label: string; cls: string }> = {
  SUBSTITUTE: { label: "Substitute",  cls: "bg-blue-100 text-blue-800"     },
  ELIDE:      { label: "Elide",       cls: "bg-red-100 text-red-800"       },
  ELIDED:     { label: "Elide",       cls: "bg-red-100 text-red-800"       },
  ADJUSTED:   { label: "Adjust cap",  cls: "bg-yellow-100 text-yellow-800" },
  HALF_SIZE:  { label: "Half size",   cls: "bg-orange-100 text-orange-800" },
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const Stat: React.FC<{ label: string; value: string; sub?: string; cls?: string }> = ({
  label, value, sub, cls = "text-gray-900",
}) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
    <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// ── Page tabs ─────────────────────────────────────────────────────────────────

type Tab = "equity" | "returns" | "trades" | "scorecard";
const TABS: { key: Tab; label: string }[] = [
  { key: "equity",    label: "Equity & drawdown"  },
  { key: "returns",   label: "Returns & trades"    },
  { key: "trades",    label: "Closed trades"       },
  { key: "scorecard", label: "Substitutions"       },
];

type ReturnSubTab = "yearly" | "monthlyReturns" | "monthlyTrades";
const RETURN_SUBTABS: { key: ReturnSubTab; label: string }[] = [
  { key: "yearly",         label: "Yearly returns" },
  { key: "monthlyReturns", label: "Monthly returns" },
  { key: "monthlyTrades",  label: "Monthly trades"  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const LivePerformancePage: React.FC = () => {
  const [strategies, setStrategies]   = useState<ExecutionEnabledStrategy[]>([]);
  const [selectedId, setSelectedId]   = useState<string>("");
  const [perf, setPerf]               = useState<LivePerf | null>(null);
  const [scorecard, setScorecard]     = useState<ScorecardResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [recalcing, setRecalcing]     = useState(false);
  const [recalcMsg, setRecalcMsg]     = useState<string | null>(null);
  const [equityMode, setEquityMode]   = useState<"equity" | "pnl">("pnl");
  const [tab, setTab]                 = useState<Tab>("equity");
  const [retSubTab, setRetSubTab]     = useState<ReturnSubTab>("yearly");

  useEffect(() => {
    fetchExecutionEnabledStrategies()
      .then((s) => { setStrategies(s); if (s.length === 1) setSelectedId(String(s[0].id)); })
      .catch(console.error);
  }, []);

  const load = useCallback(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    const id = Number(selectedId);
    Promise.all([
      API.get(`/strategy/${id}/live-performance`),
      API.get(`/strategy/${id}/substitution-scorecard`),
    ])
      .then(([p, sc]) => { setPerf(p.data); setScorecard(sc.data); })
      .catch((e) => setError(e?.response?.data?.detail ?? e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => { load(); }, [load]);

  // Patch 78: rebuild live_equity_snapshot from the tradelist, then reload.
  const recalc = useCallback(() => {
    if (!selectedId) return;
    setRecalcing(true);
    setRecalcMsg(null);
    API.post(`/strategy/${Number(selectedId)}/recalc-equity`)
      .then((r) => {
        const d = r.data || {};
        setRecalcMsg(
          d.rows_written
            ? `Recalculated ${d.rows_written} day(s) ${d.first_date} \u2192 ${d.last_date} \u00b7 equity \u00a3${Number(d.latest_equity).toLocaleString("en-GB")} \u00b7 drawdown ${d.latest_drawdown_pct}%`
            : (d.note || "Nothing to recalculate")
        );
        load();
      })
      .catch((e) => setRecalcMsg(e?.response?.data?.detail ?? e?.message ?? String(e)))
      .finally(() => setRecalcing(false));
  }, [selectedId, load]);

  const m   = perf?.metrics;
  const sc  = scorecard?.summary;

  // £ drawdown from the equity series (drawdown_offset = equity - max_equity)
  const ddSeries = perf?.equity_series.map((p) => p.drawdown_offset ?? 0) ?? [];
  const maxDrawdownGbp = ddSeries.length ? Math.min(...ddSeries) : 0;

  // ── Plotly equity chart ───────────────────────────────────────────────────
  const equityPlotData = perf ? (() => {
    const xs  = perf.equity_series.map((p) => p.date);
    const prodCap = m?.production_capital ?? 0;
    const isPnl = equityMode === "pnl";
    // Equity mode = raw equity column; P&L mode = equity - production_capital (the offset).
    const eq  = perf.equity_series.map((p) => (isPnl ? p.equity_offset : p.equity));
    const hwm = perf.equity_series.map((p) => (isPnl ? p.max_equity_offset : (p.max_equity_offset ?? 0) + prodCap));
    const dd  = perf.equity_series.map((p) => p.drawdown_offset);   // absolute drawdown (equity - max_equity)
    const refY = isPnl ? 0 : prodCap;
    const refName = isPnl ? "Break-even" : "Production capital";
    const valName = isPnl ? "P&L" : "Equity";

    return {
      data: [
        {
          x: xs, y: eq, type: "scatter", mode: "lines", name: valName,
          line: { color: "#16a34a", width: 2 },
          hovertemplate: valName + ": £%{y:,.0f}<br>%{x}<extra></extra>",
          xaxis: "x", yaxis: "y",
        },
        {
          x: xs, y: hwm, type: "scatter", mode: "lines", name: "High watermark",
          line: { color: "#6366f1", width: 1, dash: "dot" },
          hovertemplate: "HWM: £%{y:,.0f}<br>%{x}<extra></extra>",
          xaxis: "x", yaxis: "y",
        },
        {
          x: xs.length ? [xs[0], xs[xs.length - 1]] : [], y: [refY, refY],
          type: "scatter", mode: "lines", name: refName,
          line: { color: "#f59e0b", width: 1.5, dash: "dash" },
          hovertemplate: refName + ": £%{y:,.0f}<extra></extra>",
          xaxis: "x", yaxis: "y",
        },
        {
          x: xs, y: dd, type: "scatter", mode: "lines",
          fill: "tozeroy", fillcolor: "rgba(220,38,38,0.35)",
          name: "Drawdown",
          line: { color: "rgba(220,38,38,0.8)", width: 1 },
          hovertemplate: "DD: £%{y:,.0f}<br>%{x}<extra></extra>",
          xaxis: "x2", yaxis: "y2",
        },
      ],
      layout: {
        height: 540,
        plot_bgcolor: "white", paper_bgcolor: "white",
        font: { family: "Inter, sans-serif", size: 12, color: "#333" },
        hovermode: "x unified",
        legend: { orientation: "h", y: -0.2 },
        margin: { t: 20, r: 20, b: 60, l: 70 },
        xaxis:  { domain: [0, 1], anchor: "y",  showticklabels: false },
        yaxis:  { domain: [0.30, 1], title: isPnl ? "P&L (£)" : "Equity (£)", zeroline: false },
        xaxis2: { domain: [0, 1], anchor: "y2", matches: "x", title: "Date" },
        yaxis2: { domain: [0, 0.28], title: "Drawdown (£)" },
      },
    };
  })() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5">
        <div className="max-w-7xl mx-auto">
          <Link to="/main"
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest
                       text-gray-400 uppercase hover:text-indigo-600 transition-colors mb-3">
            ← Main menu
          </Link>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Performance</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Equity · returns · closed trades · substitution analysis
              </p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Strategy</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[260px]">
                <option value="">Select strategy</option>
                {strategies.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name} · cap=£{s.production_capital?.toLocaleString("en-GB") ?? "—"}
                  </option>
                ))}
              </select>
              </div>
              <button onClick={recalc} disabled={!selectedId || recalcing || loading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap">
                {recalcing ? "Recalculating..." : "Recalculate equity"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {!selectedId && (
          <div className="text-center py-24 text-gray-400 text-sm">
            Select a strategy above to view live performance
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}
        {recalcMsg && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded text-sm text-indigo-700">{recalcMsg}</div>
        )}
        {loading && (
          <div className="text-center py-24 text-gray-400 text-sm">Loading…</div>
        )}

        {perf && !loading && (
          <>
            {/* ── Metric cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <Stat label="Total return" value={fmtPct(m?.total_return_pct)}
                sub={`Capital £${m?.production_capital?.toLocaleString("en-GB") ?? "—"}`}
                cls={m && m.total_return_pct >= 0 ? "text-emerald-600" : "text-red-600"} />
              <Stat label="Closed P&L" value={fmtPnl(m?.total_closed_pnl)}
                sub={`${m?.total_trades ?? 0} trades`}
                cls={m && (m.total_closed_pnl ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"} />
              <Stat label="Win rate" value={`${m?.win_rate_pct?.toFixed(1) ?? "—"}%`}
                sub={`PF ${m?.profit_factor?.toFixed(2) ?? "—"}`} />
              <Stat label="Avg hold" value={`${m?.avg_hold_days?.toFixed(1) ?? "—"} days`} />
              <Stat label="Max drawdown" value={fmtPnl(maxDrawdownGbp)}
                sub={fmtPct(m?.max_drawdown_pct)} cls="text-red-600" />
              <Stat label="Current drawdown" value={fmtPct(m?.current_drawdown_pct)}
                cls={m && (m.current_drawdown_pct ?? 0) < -3 ? "text-red-600" : "text-gray-900"} />
            </div>

            {/* ── Page tabs ─────────────────────────────────────────────────── */}
            <div className="flex gap-0 mb-6 border-b border-gray-200">
              {TABS.map(({ key, label }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === key
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>
                  {key === "trades"    ? `${label} (${perf.closed_trades.length})`
                   : key === "scorecard" ? `${label} (${scorecard?.rows.length ?? 0})`
                   : label}
                </button>
              ))}
            </div>

            {/* ── TAB: Equity & drawdown ────────────────────────────────────── */}
            {tab === "equity" && (
              <div className="space-y-4">
                {perf.equity_series.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                    No equity data yet — appears after the first nightly run
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-4 mb-2 flex-wrap">
                      <h2 className="text-sm font-semibold text-gray-700">
                        {equityMode === "pnl" ? "P&L (£)" : "Equity (£)"}
                      </h2>
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                        <button onClick={() => setEquityMode("equity")}
                          className={`px-3 py-1 ${equityMode === "equity" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                          Equity
                        </button>
                        <button onClick={() => setEquityMode("pnl")}
                          className={`px-3 py-1 ${equityMode === "pnl" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                          P&amp;L
                        </button>
                      </div>
                      <span className="text-xs text-gray-400">
                        {equityMode === "pnl"
                          ? `P&L vs production capital £${m?.production_capital?.toLocaleString("en-GB")} · break-even = £0`
                          : `Equity vs production capital £${m?.production_capital?.toLocaleString("en-GB")} · dashed = high watermark`}
                      </span>
                    </div>
                    <Plot
                      data={equityPlotData!.data as any}
                      layout={equityPlotData!.layout as any}
                      config={{ displayModeBar: false, responsive: true }}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}

                {/* Capital deployment stacked bar */}
                {perf.equity_series.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Capital deployment</h2>
                    <Plot
                      data={[
                        {
                          x: perf.equity_series.map((p) => p.date),
                          y: perf.equity_series.map((p) => p.deployed_capital),
                          type: "bar", name: "Deployed", marker: { color: "#6366f1" },
                          hovertemplate: "Deployed: £%{y:,.0f}<extra></extra>",
                        },
                        {
                          x: perf.equity_series.map((p) => p.date),
                          y: perf.equity_series.map((p) => p.unused_capital),
                          type: "bar", name: "Unused", marker: { color: "#e0e7ff" },
                          hovertemplate: "Unused: £%{y:,.0f}<extra></extra>",
                        },
                      ] as any}
                      layout={{
                        barmode: "stack", height: 180,
                        plot_bgcolor: "white", paper_bgcolor: "white",
                        margin: { t: 10, r: 20, b: 40, l: 70 },
                        legend: { orientation: "h", y: -0.35 },
                        xaxis: { title: "Date" },
                        yaxis: { title: "£", tickformat: ",.0f" },
                      } as any}
                      config={{ displayModeBar: false, responsive: true }}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Returns & trades ─────────────────────────────────────── */}
            {tab === "returns" && (
              <div>
                {/* Return sub-tabs */}
                <nav className="flex gap-1 border-b border-gray-200 mb-4">
                  {RETURN_SUBTABS.map(({ key, label }) => (
                    <button key={key} onClick={() => setRetSubTab(key)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        retSubTab === key
                          ? "border-indigo-500 text-indigo-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}>
                      {label}
                    </button>
                  ))}
                </nav>

                {retSubTab === "yearly" && (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">
                      Annual live performance from go-live date. P&L % is relative to production capital.
                    </p>
                    {perf.yearly_returns.length === 0 ? (
                      <p className="italic text-gray-500 text-sm">No completed year data yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100 uppercase text-xs tracking-wide text-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left">Year</th>
                              <th className="px-4 py-2 text-right">P&L</th>
                              <th className="px-4 py-2 text-right">Return %</th>
                              <th className="px-4 py-2 text-right">Trades</th>
                              <th className="px-4 py-2 text-right">Win rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {perf.yearly_returns.map((yr) => (
                              <tr key={yr.year} className="hover:bg-indigo-50 transition">
                                <td className="px-4 py-2 font-semibold">{yr.year}</td>
                                <td className={`px-4 py-2 text-right ${pnlCls(yr.pnl)}`}>{fmtPnl(yr.pnl)}</td>
                                <td className={`px-4 py-2 text-right ${pnlCls(yr.pnl_pct)}`}>{fmtPct(yr.pnl_pct)}</td>
                                <td className="px-4 py-2 text-right text-gray-600">{yr.trades}</td>
                                <td className="px-4 py-2 text-right text-gray-600">{yr.win_rate.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {retSubTab === "monthlyReturns" && (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">
                      Monthly P&L as % of production capital. Green = gain, red = loss.
                    </p>
                    <MonthlyHeatmap mode="returns" rows={perf.monthly_returns} />
                  </div>
                )}

                {retSubTab === "monthlyTrades" && (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">
                      Number of trades closed each month. Darker = more trades.
                    </p>
                    <MonthlyHeatmap mode="trades" rows={perf.monthly_trades} />
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: Closed trades ────────────────────────────────────────── */}
            {tab === "trades" && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {perf.closed_trades.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No closed trades yet</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        {["Symbol","Dir","Entry date","Exit date","Entry £","Exit £",
                          "Qty","P&L £","P&L %","Days","Reason"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perf.closed_trades.map((t) => (
                        <tr key={t.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{t.symbol}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              t.direction === "LONG" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}>{t.direction}</span>
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{t.entry_date?.slice(0,10) ?? "—"}</td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{t.exit_date?.slice(0,10) ?? "—"}</td>
                          <td className="px-4 py-2">{fmt2(t.entry_price)}</td>
                          <td className="px-4 py-2">{fmt2(t.exit_price)}</td>
                          <td className="px-4 py-2">{t.filled_qty ?? "—"}</td>
                          <td className={`px-4 py-2 ${pnlCls(t.profit)}`}>{fmtPnl(t.profit)}</td>
                          <td className={`px-4 py-2 ${pnlCls(t.profit_pct)}`}>{fmtPct(t.profit_pct)}</td>
                          <td className="px-4 py-2 text-gray-500">{t.day_count ?? "—"}</td>
                          <td className="px-4 py-2 text-gray-400 text-xs">{t.exit_reason ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t font-semibold text-sm">
                      <tr>
                        <td colSpan={7} className="px-4 py-2 text-gray-600">Total ({m?.total_trades} trades)</td>
                        <td className={`px-4 py-2 ${pnlCls(m?.total_closed_pnl)}`}>{fmtPnl(m?.total_closed_pnl)}</td>
                        <td colSpan={3} className="px-4 py-2 text-gray-500 text-xs">
                          {m?.win_rate_pct?.toFixed(1)}% win · avg {m?.avg_hold_days?.toFixed(1)} days
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}

            {/* ── TAB: Substitution scorecard ───────────────────────────────── */}
            {tab === "scorecard" && scorecard && (
              <div className="space-y-4">
                {/* Cumulative summary bar */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">
                    Substitution quality — cumulative
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Stat label="Decisions" value={String(sc?.decisions ?? 0)} />
                    <Stat label="Better than system"
                      value={String(sc?.better_count ?? 0)}
                      cls="text-emerald-600" />
                    <Stat label="Worse than system"
                      value={String(sc?.worse_count ?? 0)}
                      cls="text-red-600" />
                    <Stat label="System would have made"
                      value={fmtPnl(sc?.total_system_pnl)}
                      cls={pnlCls(sc?.total_system_pnl)} />
                    <Stat label="Vas actually made"
                      value={fmtPnl(sc?.total_actual_pnl)}
                      cls={pnlCls(sc?.total_actual_pnl)} />
                    <Stat label="Net vs system"
                      value={fmtPnl(sc?.total_difference)}
                      sub={sc && sc.total_difference > 0 ? "✓ Vas adds value" : sc && sc.total_difference < 0 ? "System outperformed" : "Neutral"}
                      cls={sc && sc.total_difference >= 0 ? "text-emerald-600" : "text-red-600"} />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-emerald-600">▲ Green difference</span> = Vas's substitution outperformed what the engine would have done.
                  &nbsp;<span className="font-semibold text-red-600">▼ Red difference</span> = engine pick would have done better.
                  System P&L uses hypothetical close prices computed nightly (SPEC 9).
                </p>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
                  {scorecard.rows.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No substitution data yet — appears after Vas submits a substitution CSV
                    </div>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                          {["Date","Action","Original","Substitute","Status",
                            "System P&L","Sys %","Actual P&L","Act %",
                            "Difference","Reason"].map((h) => (
                            <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scorecard.rows.map((row, i) => {
                          const meta = ACTION_META[row.action] ?? { label: row.action, cls: "bg-gray-100 text-gray-700" };
                          const isPos = row.difference_pnl >= 0;
                          return (
                            <tr key={i} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                                {row.date?.slice(0, 10) ?? "—"}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
                                  {meta.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-mono font-semibold">{row.original_symbol}</td>
                              <td className="px-3 py-2 font-mono">
                                {row.substitute_symbol ?? <span className="text-gray-300 italic">none</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  row.status === "open" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600"
                                }`}>{row.status}</span>
                              </td>
                              <td className={`px-3 py-2 ${pnlCls(row.system_pnl)}`}>{fmtPnl(row.system_pnl)}</td>
                              <td className={`px-3 py-2 ${pnlCls(row.system_pnl_pct)}`}>{fmtPct(row.system_pnl_pct)}</td>
                              <td className={`px-3 py-2 ${pnlCls(row.actual_pnl)}`}>{fmtPnl(row.actual_pnl)}</td>
                              <td className={`px-3 py-2 ${pnlCls(row.actual_pnl_pct)}`}>{fmtPct(row.actual_pnl_pct)}</td>
                              <td className={`px-3 py-2 font-bold text-base ${isPos ? "text-emerald-600" : "text-red-600"}`}>
                                {isPos ? "▲" : "▼"} {fmtPnl(Math.abs(row.difference_pnl))}
                              </td>
                              <td className="px-3 py-2 text-gray-400 text-xs max-w-[160px] truncate"
                                  title={row.reason_for_action ?? ""}>
                                {row.reason_for_action ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LivePerformancePage;