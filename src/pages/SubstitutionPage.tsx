import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  overlayAndWriteAll,
  overlayAndWriteCombined,
  OverlayAndWriteAllResponse,
  StrategyOverlayResult,
} from "../services/eodRunLogService.ts";
import {
  ExecutionEnabledStrategy,
  TradelistRow,
  fetchExecutionEnabledStrategies,
  fetchBasketForDate,
  fetchLatestBasketDate,
  combinedBasketCsvUrl,
} from "../services/tradelistService.ts";



const fmt = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : Number(v).toFixed(d);

// ── Component ─────────────────────────────────────────────────────────────────

const SubstitutionPage: React.FC = () => {
  const [strategies, setStrategies] = useState<ExecutionEnabledStrategy[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [tradeDate, setTradeDate] = useState<string>("");
  const [proposed, setProposed] = useState<TradelistRow[]>([]);
  const [subs, setSubs] = useState<TradelistRow[]>([]);
  const [loadingBasket, setLoadingBasket] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OverlayAndWriteAllResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load execution-enabled strategies on mount
  useEffect(() => {
    fetchExecutionEnabledStrategies()
      .then((data) => {
        setStrategies(data);
        if (data.length === 1) setSelectedId(String(data[0].id));
      })
      .catch(console.error);
  }, []);

  // Resolve today's trade date on mount
  useEffect(() => {
    fetchLatestBasketDate()
      .then((d) => {
        if (d) setTradeDate(d);
      })
      .catch(console.error);
  }, []);

  // Load basket when trade date changes
  const load = useCallback(() => {
    if (!tradeDate) return;
    setLoadingBasket(true);
    setError(null);
    fetchBasketForDate(tradeDate)
      .then((rows) => {
        setProposed(rows.filter((r) => r.status === "PROPOSED"));
        setSubs(rows.filter((r) => r.status === "SUBSTITUTE_POOL"));
      })
      .catch((e) => setError(`Failed to load basket: ${e.message ?? e}`))
      .finally(() => setLoadingBasket(false));
  }, [tradeDate]);

  useEffect(() => {
    load();
  }, [load]);

// Single combined CSV file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setCsvFile(f);
    setResult(null);
    setError(null);
  };

  // Parse combined CSV → apply all strategies → write XLSX
  // Date and System columns in the CSV drive routing — no manual date/strategy needed
  const handleSubmit = async () => {
    if (!csvFile) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const csvText = await csvFile.text();
      const res = await overlayAndWriteCombined(csvText);
      setResult(res);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <Link
        to="/main"
        className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase hover:text-indigo-600 transition-colors mb-4"
      >
        ← Main menu
      </Link>
      <h1 className="text-2xl font-bold text-indigo-700 mb-1">
        Morning Substitution
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Review today's proposed basket and substitute pool. Upload a substitution
        CSV to adjust positions, then generate the M_Combined XLSX for IBKR.
      </p>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Strategy
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border rounded px-3 py-2 text-sm min-w-[220px]"
          >
            <option value="">Select strategy</option>
            {strategies.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Trade date
          </label>
          <input
            type="date"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={load}
          disabled={loadingBasket}
          className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
        >
          {loadingBasket ? "Loading…" : "Refresh"}
        </button>
        {tradeDate && (
          <a
            href={combinedBasketCsvUrl(tradeDate)}
            download
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ml-auto"
          >
            ⬇ Download M_Combined.csv
          </a>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Proposed + Sub Pool tables */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* PROPOSED */}
        <div className="border border-gray-200 rounded-lg bg-white">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="text-sm font-semibold text-gray-800">
              PROPOSED{" "}
              <span className="text-gray-400 font-normal">
                · {proposed.length} rows
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Rank</th>
                  <th className="px-3 py-2 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2 text-left font-medium">Qty</th>
                  <th className="px-3 py-2 text-left font-medium">Limit</th>
                  <th className="px-3 py-2 text-left font-medium">Stop</th>
                </tr>
              </thead>
              <tbody>
                {proposed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-gray-400 text-center">
                      No PROPOSED rows for {tradeDate || "selected date"}
                    </td>
                  </tr>
                ) : (
                  proposed.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{r.ranking_rank ?? "—"}</td>
                      <td className="px-3 py-2 font-medium">{r.symbol}</td>
                      <td className="px-3 py-2">{r.intended_qty ?? "—"}</td>
                      <td className="px-3 py-2">{fmt(r.limit_price)}</td>
                      <td className="px-3 py-2">{fmt(r.initial_stop_price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUBSTITUTE_POOL */}
        <div className="border border-gray-200 rounded-lg bg-white">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="text-sm font-semibold text-gray-800">
              SUBSTITUTE POOL{" "}
              <span className="text-gray-400 font-normal">
                · {subs.length} available
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Rank</th>
                  <th className="px-3 py-2 text-left font-medium">Symbol</th>
                  <th className="px-3 py-2 text-left font-medium">Qty</th>
                  <th className="px-3 py-2 text-left font-medium">Limit</th>
                </tr>
              </thead>
              <tbody>
                {subs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-gray-400 text-center">
                      No substitutes available
                    </td>
                  </tr>
                ) : (
                  subs.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50 text-gray-700">
                      <td className="px-3 py-2">{r.ranking_rank ?? "—"}</td>
                      <td className="px-3 py-2 font-medium">{r.symbol}</td>
                      <td className="px-3 py-2">{r.intended_qty ?? "—"}</td>
                      <td className="px-3 py-2">{fmt(r.limit_price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

{/* CSV Upload + Result + Submit */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Upload Substitution CSVs
        </h2>
        <p className="text-xs text-gray-500 mb-1">
          Upload one CSV per strategy. Each file must be named after the strategy
          exactly — e.g. <code className="bg-gray-100 px-1 rounded">PullBack_X3_Sp500.csv</code>
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Required columns:{" "}
          <code className="bg-gray-100 px-1 rounded">
            original_symbol, action, substitute_symbol, adjusted_capital
          </code>
          &nbsp; Actions:{" "}
          {["elide", "substitute", "adjust_capital", "half_size"].map((a) => (
            <code key={a} className="bg-gray-100 px-1 rounded mr-1">{a}</code>
          ))}
        </p>

        {/* Single combined CSV file */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="text-sm text-gray-600 mb-4 file:mr-3 file:py-1 file:px-3
                     file:rounded file:border-0 file:text-sm file:bg-indigo-50
                     file:text-indigo-700 hover:file:bg-indigo-100"
        />

        {/* Selected file */}
        {csvFile && (
          <div className="mb-4">
            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100">
              {csvFile.name}
            </span>
            <span className="ml-2 text-xs text-gray-400">
              Date and System columns are parsed automatically
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            ✗ {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm">
            <p className="font-semibold text-green-900 mb-3">
              ✓ Done — {result.strategies_ok} of {result.strategies_run} strategies applied
              · {result.orders_written} orders written · {result.exits_written} exits
            </p>

            {/* Per-strategy breakdown */}
            <div className="space-y-2 mb-3">
              {result.overlay_results.map((r) => (
                <div
                  key={r.strategy_name}
                  className={`p-3 rounded border text-xs ${
                    r.status === "ok"
                      ? "bg-white border-green-100 text-green-900"
                      : r.status === "error"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  <span className="font-semibold">{r.strategy_name}</span>
                  {r.status === "ok" && (
                    <span className="ml-2 text-gray-500">
                      elide={r.elided} sub={r.substituted} adj={r.adjusted_capital} half={r.half_sized} skipped={r.skipped_no_match}
                    </span>
                  )}
                  {r.status !== "ok" && (
                    <span className="ml-2">{r.error}</span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-600 font-mono break-all">{result.file_path}</p>
          </div>
        )}

        {/* Submit */}
            <button
          disabled={!csvFile || submitting}
          onClick={handleSubmit}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg
                     hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Applying…" : "▶ Apply & Generate XLSX"}
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Strategies with no CSV uploaded are untouched — their PROPOSED rows go straight to the basket.
        </p>
      </div>
    </div>
  );
};

export default SubstitutionPage;