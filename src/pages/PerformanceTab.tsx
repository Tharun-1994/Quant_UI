import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js"; // Patch 50
import {
  PerformanceMetrics,
  MonthlyReturnRow,
  MonthlyTradesRow,
} from "../model/Performance";
import { fetchPerformanceData,
  utilityDistribution, } from "../services/strategyService.ts";
import { MONTH_LABELS } from "../constants/uiConstants.ts";

interface Props {
  strategyId: number;
}

// ── Sub-tabs inside the Performance tab ───────────────────────────────────────
type SubTabKey = "yearly" | "monthlyReturns" | "monthlyTrades" | "utility";

const SUBTABS: { key: SubTabKey; label: string }[] = [
  { key: "yearly", label: "Yearly Returns" },
  { key: "monthlyReturns", label: "Monthly Returns" },
  { key: "monthlyTrades", label: "Monthly Trades" },
  { key: "utility", label: "Utility Distribution" },
];

// ── Heatmap colour helpers ────────────────────────────────────────────────────
// NOTE: colours are applied via inline style (computed RGB), NOT Tailwind class
// names. Tailwind purges class names it can't see at build time, so dynamic
// names like `bg-green-${n}` would silently render as no background. Inline
// style is purge-proof and lets us scale intensity continuously.
type RGB = [number, number, number];

const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [22, 163, 74]; // tailwind green-600 — gains
const RED: RGB = [220, 38, 38]; // tailwind red-600   — losses
const INDIGO: RGB = [79, 70, 229]; // tailwind indigo-600 — trade volume

const CAP = 0.85; // never fully saturate, so text stays readable

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function mix(a: RGB, b: RGB, t: number): RGB {
  const k = clamp01(t);
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ];
}

const rgb = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

// Diverging scale for returns: white at 0, green for gains, red for losses.
function divergingBg(value: number, maxAbs: number): RGB {
  if (!maxAbs || maxAbs <= 0) return WHITE;
  const t = clamp01(Math.abs(value) / maxAbs) * CAP;
  return value >= 0 ? mix(WHITE, GREEN, t) : mix(WHITE, RED, t);
}

// Sequential scale for counts: white at 0 → indigo at the busiest month.
function sequentialBg(value: number, maxVal: number): RGB {
  if (!maxVal || maxVal <= 0 || value <= 0) return WHITE;
  const t = clamp01(value / maxVal) * CAP;
  return mix(WHITE, INDIGO, t);
}

// WCAG relative luminance → pick dark or light text for contrast.
function textOn([r, g, b]: RGB): string {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#111827" : "#ffffff"; // gray-900 / white
}

// ── Heatmap component (shared by returns + trades) ────────────────────────────
type HeatMode = "returns" | "trades";

interface HeatRow {
  year: number;
  months: (number | null)[];
  total: number | null;
}

const MonthlyHeatmap: React.FC<{ mode: HeatMode; rows: HeatRow[] }> = ({
  mode,
  rows,
}) => {
  if (!rows || rows.length === 0) {
    return <p className="italic text-gray-500">No monthly data available.</p>;
  }

  const isReturns = mode === "returns";

  // Normalise month cells and the Total column independently so each region
  // uses its full colour range (Totals are larger than any single month).
  let maxAbsMonth = 0;
  let maxAbsTotal = 0;
  for (const r of rows) {
    for (const v of r.months) {
      if (v != null) maxAbsMonth = Math.max(maxAbsMonth, Math.abs(v));
    }
    if (r.total != null) maxAbsTotal = Math.max(maxAbsTotal, Math.abs(r.total));
  }

  const cellBg = (v: number, isTotal: boolean): RGB => {
    const scale = isTotal ? maxAbsTotal : maxAbsMonth;
    return isReturns ? divergingBg(v, scale) : sequentialBg(v, scale);
  };

  const fmt = (v: number) => (isReturns ? v.toFixed(2) : String(v));

  const renderCell = (v: number | null, key: React.Key, isTotal: boolean) => {
    const edge = isTotal ? "border-l border-gray-300 font-semibold" : "";
    if (v == null) {
      return (
        <td key={key} className={`px-2 py-1 text-gray-300 bg-gray-50 ${edge}`}>
          ·
        </td>
      );
    }
    const bg = cellBg(v, isTotal);
    return (
      <td
        key={key}
        className={`px-2 py-1 ${edge}`}
        style={{
          backgroundColor: rgb(bg),
          color: textOn(bg),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmt(v)}
      </td>
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm text-center whitespace-nowrap border-collapse">
          <thead className="bg-gray-100 uppercase text-xs tracking-wide text-gray-700">
            <tr>
              <th className="px-2 py-1 text-left sticky left-0 bg-gray-100 z-10">
                Year
              </th>
              {MONTH_LABELS.map((m) => (
                <th key={m} className="px-2 py-1">
                  {m}
                </th>
              ))}
              <th className="px-2 py-1 border-l border-gray-300">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <td className="px-2 py-1 font-medium text-left sticky left-0 bg-white z-10">
                  {r.year}
                </td>
                {r.months.map((v, i) => renderCell(v, `m${i}`, false))}
                {renderCell(r.total, "total", true)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {isReturns ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
          <span>Loss</span>
          <span
            className="inline-block h-3 w-32 rounded"
            style={{
              background: `linear-gradient(to right, ${rgb(
                mix(WHITE, RED, CAP)
              )}, ${rgb(WHITE)}, ${rgb(mix(WHITE, GREEN, CAP))})`,
            }}
          />
          <span>Gain</span>
          <span className="ml-1">· % of starting capital, per month</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
          <span>0</span>
          <span
            className="inline-block h-3 w-32 rounded"
            style={{
              background: `linear-gradient(to right, ${rgb(WHITE)}, ${rgb(
                mix(WHITE, INDIGO, CAP)
              )})`,
            }}
          />
          <span>{maxAbsMonth > 0 ? maxAbsMonth : ""}</span>
          <span className="ml-1">· closed trades per month</span>
        </div>
      )}
    </>
  );
};

// ── Performance tab ───────────────────────────────────────────────────────────
const PerformanceTab: React.FC<Props> = ({ strategyId }) => {
const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [subTab, setSubTab] = useState<SubTabKey>("yearly");

  // Patch 50: utility distribution figure (lazy-loaded when the tab opens)
  const [utilFig, setUtilFig] = useState<{
    data: any[];
    layout: any;
    averages?: {
      max_slots: number;
      overall: { avg_slots: number; util_pct: number; avg_capital: number; days: number };
      by_year: { year: number; avg_slots: number; util_pct: number; avg_capital: number; days: number }[];
    };
  } | null>(null);
  const [utilError, setUtilError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData(strategyId)
      .then((data) => {
        console.log("Fetched performance data:", data); // Debugging line
        setMetrics(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(false));
  }, [strategyId]);

  // Patch 50: fetch the utility figure the first time the Utility tab is opened
  useEffect(() => {
    if (subTab !== "utility" || utilFig) return;
    utilityDistribution(strategyId)
      .then((fig) => {
        setUtilFig(fig);
        setUtilError(null);
      })
      .catch(() => setUtilError("Failed to load utility data"));
  }, [subTab, strategyId, utilFig]);

  if (!loaded || !metrics) {
    return <p className="italic text-gray-500">Loading performance data…</p>;
  }

  const monthlyReturns: MonthlyReturnRow[] = metrics.monthly_returns ?? [];
  const monthlyTrades: MonthlyTradesRow[] = metrics.monthly_trades ?? [];

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-6">
      <h2 className="text-xl font-semibold">Performance Metrics</h2>

      {/* Summary grid */}
      <ul className="grid grid-cols-2 gap-4 text-sm mb-6">
        <li><strong>Total Profit:</strong> {metrics.total_profit}</li>
        <li><strong>Total Trades:</strong> {metrics.total_trades}</li>
        <li><strong>Avg Trade Profit:</strong> {metrics.avg_trade_profit}</li>
        <li><strong>Max Drawdown:</strong> {metrics.max_drawdown}</li>
        <li><strong>Win Rate %:</strong> {metrics.win_rate_pct}</li>
        <li><strong>Profit Factor:</strong> {metrics.profit_factor}</li>
        <li><strong>Sharpe Ratio:</strong> {metrics.sharpe_ratio}</li>
        <li><strong>K-Ratio:</strong> {metrics.k_ratio}</li>
      </ul>

      {/* Drawdowns */}
      {metrics.top10_dd?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Top 10 Worst Drawdowns</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-gray-100 uppercase text-xs tracking-wide text-gray-700">
                <tr>
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Start Date</th>
                  <th className="px-2 py-1">End Date</th>
                  <th className="px-2 py-1">Length</th>
                  <th className="px-2 py-1">Max DD</th>
                  <th className="px-2 py-1">Avg DD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.top10_dd.map((dd, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50 transition">
                    <td className="px-2 py-1 font-medium">{idx + 1}</td>
                    <td className="px-2 py-1">{dd.start_date}</td>
                    <td className="px-2 py-1">{dd.end_date}</td>
                    <td className="px-2 py-1">{dd.length}</td>
                    <td className="px-2 py-1">{dd.max_dd}</td>
                    <td className="px-2 py-1">{dd.avg_dd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Returns & trades breakdown */}
      <div>
        <h3 className="font-semibold mb-2">Returns &amp; Trades</h3>

        {/* Sub-tabs */}
        <nav className="flex space-x-4 border-b pb-2 mb-4">
          {SUBTABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSubTab(key)}
              className={`pb-2 px-3 font-medium ${
                subTab === key
                  ? "border-b-2 border-indigo-600 text-indigo-700"
                  : "text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Yearly returns table */}
        {subTab === "yearly" &&
          (metrics.yearly_returns?.length > 0 ? (
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Annual strategy return vs the SPY benchmark.
              </p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-gray-100 uppercase text-xs tracking-wide text-gray-700">
                    <tr>
                      <th className="px-2 py-1">Year</th>
                      <th className="px-2 py-1">Strategy %</th>
                      <th className="px-2 py-1">Trades per Year</th>
                      <th className="px-2 py-1">SPY %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {metrics.yearly_returns.map((yr) => (
                      <tr key={yr.year} className="hover:bg-indigo-50 transition">
                        <td className="px-2 py-1 font-medium">{yr.year}</td>
                        <td className="px-2 py-1">{yr.strategy}</td>
                        <td className="px-2 py-1">{yr.trades_per_year}</td>
                        <td className="px-2 py-1">{yr.spy ?? "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="italic text-gray-500">No yearly data available.</p>
          ))}

        {/* Monthly returns heatmap */}
        {subTab === "monthlyReturns" && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Monthly profit/loss as a % of starting capital. Green = gain, red
              = loss.
            </p>
            <MonthlyHeatmap mode="returns" rows={monthlyReturns} />
          </div>
        )}

{/* Monthly trades heatmap */}
        {subTab === "monthlyTrades" && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              Number of trades closed each month. Darker = busier.
            </p>
            <MonthlyHeatmap mode="trades" rows={monthlyTrades} />
          </div>
        )}

        {/* Patch 50: utility distribution */}
        {subTab === "utility" && (
          <div>
            <p className="text-xs text-gray-500 mb-2">
              How often the strategy holds each number of position slots (and
              the capital deployed), as a % of all trading days.
            </p>
            {utilError ? (
              <p className="text-red-500">{utilError}</p>
) : utilFig ? (
              <>
                <Plot
                  data={utilFig.data}
                  layout={utilFig.layout}
                  style={{ width: "100%", height: "440px" }}
                />
                {/* Patch 51: average utility by year + overall */}
                {utilFig.averages && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-1">Average utility by year</h4>
                    <p className="text-xs text-gray-500 mb-2">
                      Mean position slots held per day (and capital deployed), by
                      calendar year. % of capacity = average slots ÷{" "}
                      {utilFig.averages.max_slots}.
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                      <table className="min-w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-100 uppercase text-xs tracking-wide text-gray-700">
                          <tr>
                            <th className="px-2 py-1">Year</th>
                            <th className="px-2 py-1 text-right">Avg utility (slots)</th>
                            <th className="px-2 py-1 text-right">% of capacity</th>
                            <th className="px-2 py-1 text-right">Avg capital deployed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {utilFig.averages.by_year.map((r) => (
                            <tr key={r.year} className="hover:bg-indigo-50 transition">
                              <td className="px-2 py-1 font-medium">{r.year}</td>
                              <td className="px-2 py-1 text-right">{r.avg_slots.toFixed(2)}</td>
                              <td className="px-2 py-1 text-right">{r.util_pct.toFixed(1)}%</td>
                              <td className="px-2 py-1 text-right">
                                £{Math.round(r.avg_capital).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-indigo-50 font-semibold border-t border-gray-300">
                            <td className="px-2 py-1 text-indigo-700">Overall</td>
                            <td className="px-2 py-1 text-right text-indigo-700">
                              {utilFig.averages.overall.avg_slots.toFixed(2)}
                            </td>
                            <td className="px-2 py-1 text-right text-indigo-700">
                              {utilFig.averages.overall.util_pct.toFixed(1)}%
                            </td>
                            <td className="px-2 py-1 text-right text-indigo-700">
                              £{Math.round(utilFig.averages.overall.avg_capital).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="italic text-gray-500">Loading utility data…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTab;