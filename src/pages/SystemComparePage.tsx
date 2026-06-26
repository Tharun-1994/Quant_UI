import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Plot from "react-plotly.js";
import {
  listUploadedSystems,
  uploadSystem,
  deleteUploadedSystem,
  updateStartingCapital,
  compareUploadedSystems,
  UploadedSystem,
  ComparePayload,
} from "../services/uploadedSystemService.ts";

// Same palette as the backend, assigned by selection order, so the library
// dots, chart traces and table columns all use matching colours.
const PALETTE = [
  "#4f46e5", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#7c3aed", "#ca8a04", "#db2777",
];

const fmtMetric = (key: string, v: number | undefined | null): string => {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  switch (key) {
    case "total_profit":
    case "max_dd":
      return "$" + Math.round(v).toLocaleString();
    case "cagr_pct":
    case "win_rate_pct":
      return v.toFixed(2) + "%";
    case "sharpe":
    case "k_ratio":
      return v.toFixed(3);
    case "profit_factor":
      return v.toFixed(2);
    case "trades":
      return Math.round(v).toLocaleString();
    default:
      return String(v);
  }
};

const yearTint = (v: number | undefined | null): string =>
  v === undefined || v === null ? "" : v > 0 ? "bg-green-50" : v < 0 ? "bg-red-50" : "";

const fmtRange = (s: UploadedSystem): string =>
  s.start_date && s.end_date ? `${s.start_date} → ${s.end_date}` : "—";

const SystemComparePage: React.FC = () => {
  const [systems, setSystems] = useState<UploadedSystem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [scale, setScale] = useState<"indexed" | "absolute">("absolute");

  const [compare, setCompare] = useState<ComparePayload | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [recomputeTick, setRecomputeTick] = useState(0); // bump to re-fetch compare

  // Upload form
  const [name, setName] = useState("");
  const [startingCapital, setStartingCapital] = useState("");
  const [equityFile, setEquityFile] = useState<File | null>(null);
  const [tradelistFile, setTradelistFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0); // bump to clear the native file inputs

  const refreshList = () => {
    setLoadingList(true);
    listUploadedSystems()
      .then((rows) => {
        setSystems(rows);
        setListError(null);
      })
      .catch(() => setListError("Failed to load saved systems"))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    refreshList();
  }, []);

  // (Re)build the comparison whenever the selection or scale changes.
  useEffect(() => {
    if (selectedIds.length === 0) {
      setCompare(null);
      setCompareError(null);
      return;
    }
    setLoadingCompare(true);
    compareUploadedSystems(selectedIds, scale)
      .then((res) => {
        setCompare(res);
        setCompareError(null);
      })
      .catch(() => setCompareError("Failed to build comparison"))
      .finally(() => setLoadingCompare(false));
  }, [selectedIds, scale, recomputeTick]);

  const toggleSelected = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleUpload = async () => {
    setUploadError(null);
    if (!name.trim()) {
      setUploadError("Please enter a name.");
      return;
    }
    if (!equityFile || !tradelistFile) {
      setUploadError("Please choose both CSV files.");
      return;
    }
    setUploading(true);
    try {
      const cap = startingCapital.trim() ? Number(startingCapital) : undefined;
      await uploadSystem(name.trim(), equityFile, tradelistFile, cap);
      setName("");
      setStartingCapital("");
      setEquityFile(null);
      setTradelistFile(null);
      setFormKey((k) => k + 1);
      refreshList();
    } catch (e: any) {
      setUploadError(e?.response?.data?.detail ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteUploadedSystem(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      refreshList();
    } catch {
      /* non-fatal; leave the list as-is */
    }
  };

  // Save an edited starting capital, then recompute the chart if it's selected.
  const saveCap = async (id: number, raw: string) => {
    const v = Number(raw);
    if (!raw.trim() || Number.isNaN(v) || v <= 0) {
      refreshList(); // invalid -> revert the field to the stored value
      return;
    }
    const current = systems.find((s) => s.id === id)?.starting_capital;
    if (current === v) return; // unchanged
    try {
      await updateStartingCapital(id, v);
      setSystems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, starting_capital: v } : s))
      );
      if (selectedIds.includes(id)) setRecomputeTick((t) => t + 1);
    } catch {
      refreshList();
    }
  };

  const colCount = (compare?.table.systems.length ?? 0) + 2; // label + systems + SPY

  return (
    <div className="p-6 max-w-[1180px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-indigo-600">System comparison</h1>
        <Link to="/main" className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase hover:text-indigo-600 transition-colors">
          ← Main menu
        </Link>
      </div>

      {/* Upload */}
      <div className="bg-white p-5 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Add a system</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. pull_back_500_5%stp"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Starting capital (optional)
            </label>
            <input
              value={startingCapital}
              onChange={(e) => setStartingCapital(e.target.value)}
              type="number"
              placeholder="defaults to 100,000"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Equity CSV</label>
            <input
              key={`eq-${formKey}`}
              type="file"
              accept=".csv"
              onChange={(e) => setEquityFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tradelist CSV</label>
            <input
              key={`tr-${formKey}`}
              type="file"
              accept=".csv"
              onChange={(e) => setTradelistFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
        </div>
        {uploadError && <p className="text-sm text-red-600 mt-3">{uploadError}</p>}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Add system"}
        </button>
      </div>

      {/* Library */}
      <div className="bg-white p-5 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Your systems</h2>
        {loadingList ? (
          <p className="italic text-gray-500">Loading…</p>
        ) : listError ? (
          <p className="text-red-600 text-sm">{listError}</p>
        ) : systems.length === 0 ? (
          <p className="italic text-gray-500">No systems yet — add one above.</p>
        ) : (
          <div className="divide-y">
            {systems.map((s) => {
              const selIdx = selectedIds.indexOf(s.id);
              const dot = selIdx >= 0 ? PALETTE[selIdx % PALETTE.length] : "#d1d5db";
              return (
                <div key={s.id} className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={selIdx >= 0}
                    onChange={() => toggleSelected(s.id)}
                  />
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: dot }}
                  />
                  <span className="font-medium flex-1 break-all">{s.name}</span>
                  <label
                    className="text-sm text-gray-500 flex items-center gap-1"
                    title="Starting capital — subtracted from equity in the Profit view"
                  >
                    <span className="text-gray-400">$</span>
                    <input
                      key={`cap-${s.id}-${s.starting_capital}`}
                      type="number"
                      defaultValue={s.starting_capital}
                      onBlur={(e) => saveCap(s.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      className="w-28 border rounded px-2 py-1 text-sm text-right"
                    />
                  </label>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {fmtRange(s)}
                  </span>
                  <span className="text-sm text-gray-500 w-28 text-right">
                    {s.n_trades?.toLocaleString() ?? "—"} trades
                  </span>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparison */}
      {selectedIds.length > 0 && (
        <div className="bg-white p-5 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Comparison</h2>
            <div className="inline-flex rounded border overflow-hidden text-sm">
              <button
                onClick={() => setScale("indexed")}
                className={
                  scale === "indexed"
                    ? "px-3 py-1 bg-indigo-600 text-white"
                    : "px-3 py-1 bg-white text-gray-700"
                }
              >
                Indexed
              </button>
              <button
                onClick={() => setScale("absolute")}
                className={
                  scale === "absolute"
                    ? "px-3 py-1 bg-indigo-600 text-white"
                    : "px-3 py-1 bg-white text-gray-700"
                }
              >
                Profit ($)
              </button>
            </div>
          </div>

          {loadingCompare ? (
            <p className="italic text-gray-500">Building comparison…</p>
          ) : compareError ? (
            <p className="text-red-600 text-sm">{compareError}</p>
          ) : compare ? (
            <>
              <Plot
                data={compare.figure.data}
                layout={compare.figure.layout}
                style={{ width: "100%", height: "560px" }}
              />

              {/* Combined metrics + yearly table — systems as columns, SPY as benchmark */}
              <div className="overflow-x-auto mt-6">
                <table className="text-sm border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 sticky left-0 bg-white" />
                      {compare.table.systems.map((s) => (
                        <th
                          key={s.id}
                          className="text-right px-3 py-2 font-semibold whitespace-nowrap"
                          style={{ color: s.color }}
                        >
                          {s.name}
                        </th>
                      ))}
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">
                        SPY
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        colSpan={colCount}
                        className="text-left px-3 py-2 text-xs uppercase tracking-wide text-gray-400 bg-gray-50"
                      >
                        Summary metrics
                      </td>
                    </tr>
                    {compare.table.metric_rows.map((row) => (
                      <tr key={row.key} className="border-t">
                        <td className="text-left px-3 py-2 text-gray-600 sticky left-0 bg-white">
                          {row.label}
                        </td>
                        {compare.table.systems.map((s) => (
                          <td key={s.id} className="text-right px-3 py-2 tabular-nums">
                            {fmtMetric(row.key, s.metrics[row.key])}
                          </td>
                        ))}
                        <td className="text-right px-3 py-2 text-gray-400">—</td>
                      </tr>
                    ))}

                    <tr>
                      <td
                        colSpan={colCount}
                        className="text-left px-3 py-2 text-xs uppercase tracking-wide text-gray-400 bg-gray-50"
                      >
                        Yearly returns (%)
                      </td>
                    </tr>
                    {compare.table.years.map((y) => {
                      const sv = compare.table.spy[String(y)];
                      return (
                        <tr key={y} className="border-t">
                          <td className="text-left px-3 py-2 text-gray-600 sticky left-0 bg-white">
                            {y}
                          </td>
                          {compare.table.systems.map((s) => {
                            const v = s.yearly[String(y)];
                            return (
                              <td
                                key={s.id}
                                className={`text-right px-3 py-2 tabular-nums ${yearTint(v)}`}
                              >
                                {v === undefined || v === null ? "—" : v.toFixed(2)}
                              </td>
                            );
                          })}
                          <td
                            className={`text-right px-3 py-2 tabular-nums ${yearTint(sv)}`}
                          >
                            {sv === undefined || sv === null ? "—" : sv.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SystemComparePage;