// src/pages/StrategyTable.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Strategy } from "../model/Strategy.ts";
import { fetchStrategies, deleteStrategy } from "../services/strategyService.ts";
// Patch 77: "Update today's prices" — append static universes/index to today
import {
  refreshUniversesToday,
  RefreshUniversesTodayResponse,
  UniverseRefreshItem,
} from "../services/eodRunLogService.ts";

// ── Patch 77: result-panel helpers ──────────────────────────────────────────
const REFRESH_BADGE: Record<string, { cls: string; label: string }> = {
  APPENDED: { cls: "bg-emerald-100 text-emerald-800", label: "Updated" },
  CURRENT: { cls: "bg-gray-100 text-gray-600", label: "Already current" },
  SKIPPED: { cls: "bg-amber-100 text-amber-800", label: "No base" },
  ERROR: { cls: "bg-red-100 text-red-800", label: "Failed" },
};

const fmtDay = (d?: string): string =>
  d
    ? new Date(d + "T00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : "";

function refreshItemDetail(item: UniverseRefreshItem): string {
  if (item.status === "APPENDED") {
    const appended = item.appended ?? [];
    const days = appended.map(fmtDay).join(", ");
    const members = item.num_tickers ? ` · ${item.num_tickers} members` : "";
    return `+${appended.length} trading day${appended.length > 1 ? "s" : ""}: ${days}${members}`;
  }
  if (item.status === "CURRENT") return `Already current to ${fmtDay(item.last_stored)}`;
  return item.reason ?? "";
}

const RefreshItemRow: React.FC<{ name: string; item: UniverseRefreshItem }> = ({
  name,
  item,
}) => {
  const b = REFRESH_BADGE[item.status] ?? {
    cls: "bg-gray-100 text-gray-600",
    label: item.status,
  };
  const restated = item.restated ?? [];
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <code className="text-sm font-semibold text-gray-800">{name}</code>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>
          {b.label}
        </span>
      </div>
      <div className="text-right flex-1 min-w-0">
        <div className={`text-sm ${item.status === "ERROR" ? "text-red-700" : "text-gray-600"}`}>
          {refreshItemDetail(item)}
        </div>
        {restated.length > 0 && (
          <div className="mt-1 text-xs text-amber-700">
            ⚠ Restated since last update: <strong>{restated.join(", ")}</strong> — appended
            entry price may differ; expect a possible backtest-vs-live mismatch.
          </div>
        )}
      </div>
    </div>
  );
};

const StrategyTable: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Patch 77: update-today's-prices state
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<RefreshUniversesTodayResponse | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchStrategies()
      .then(setStrategies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (strat: Strategy) => {
    const confirmed = window.confirm(
      `Delete strategy "${strat.name}"?\n\nThis will also remove all related market regimes. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(strat.id);
      setError(null);
      await deleteStrategy(strat.id);
      setStrategies((prev) => prev.filter((s) => s.id !== strat.id));
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to delete strategy"
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Patch 77: append the static backtest universes + index series up to today.
  // Synchronous — the button stays in "Updating…" until the summary returns.
  const handleRefreshToday = async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      setRefreshResult(null);
      const result = await refreshUniversesToday();
      setRefreshResult(result);
    } catch (err: any) {
      setRefreshError(
        err?.response?.data?.detail || err?.message || "Failed to update prices"
      );
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <p className="p-6">Loading strategies...</p>;
  }



  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link to="/main" className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase hover:text-indigo-600 transition-colors mb-3">
              ← Main menu
            </Link>
            <h1 className="text-3xl font-bold text-indigo-700 mb-1">
              Strategy Dashboard
            </h1>
          <p className="text-sm text-gray-500">
            View and manage your saved strategies.
          </p>
        </div>
        {/* Patch 77: wrap buttons in a column so the data-freshness caption sits beneath */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/indicators")}
              className="px-4 py-2 text-sm border border-indigo-300 text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
            >
              Rule info
            </button>
            <button
              onClick={() => navigate("/strategies/new")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
            >
              + New Strategy
            </button>
            {/* Patch 77: append static backtest universes + index to today's close */}
            <button
              onClick={handleRefreshToday}
              disabled={refreshing}
              className="px-4 py-2 text-sm border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
              </svg>
              {refreshing ? "Updating…" : "Update today's prices"}
            </button>
          </div>
          <p className="text-xs text-gray-400 max-w-sm text-right leading-snug">
            Brings the backtest data up to today's close. A holding's entry price can
            differ from a previous run if Norgate restated it for a dividend or split.
          </p>
        </div>
        {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>Error: {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 font-medium"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      </header>

      {/* Patch 77: update-prices error + result panel */}
      {refreshError && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>Couldn't update prices: {refreshError}</span>
          <button
            onClick={() => setRefreshError(null)}
            className="text-red-700 hover:text-red-900 font-medium"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {refreshResult && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {refreshResult.today_excluded
                ? `Data updated through ${fmtDay(refreshResult.resolved_data_date)}`
                : `Data updated to ${fmtDay(refreshResult.resolved_data_date)}`}
            </h2>
            <button
              onClick={() => setRefreshResult(null)}
              className="text-gray-400 hover:text-gray-700 text-sm"
            >
              Dismiss ×
            </button>
          </div>

          {refreshResult.has_errors && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              Some universes failed to update. Fix the cause shown below and run again —
              the ones that succeeded are already saved.
            </div>
          )}
          {refreshResult.today_excluded && (
            <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              Today's session ({fmtDay(refreshResult.requested_end)}) isn't posted by
              Norgate yet — data updated through{" "}
              <strong>{fmtDay(refreshResult.resolved_data_date)}</strong>. Run again after
              ~22:30 UK to pick up today.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Universes
              </div>
              {refreshResult.universes.map((u) => (
                <RefreshItemRow key={u.slug} name={u.slug ?? ""} item={u} />
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Index series
              </div>
              {refreshResult.index.map((ix) => (
                <RefreshItemRow key={ix.key} name={ix.key ?? ""} item={ix} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Saved Strategies</h2>
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 text-left text-sm font-medium text-gray-700">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">System type</th>
              <th className="px-4 py-2">Market regime </th>
              {/* <th className="px-4 py-2">Slots</th> */}
              <th className="px-4 py-2">Created At</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-200">
            {strategies.map((strat) => (
              <tr key={strat.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{strat.name}</td>
                <td className="px-4 py-2">{strat.system_type}</td>
                {/* <td className="px-4 py-2">
                  ${strat.capital.toLocaleString()}
                </td> */}
                <td className="px-4 py-2">{strat.market_regime_type}</td>
                <td className="px-4 py-2">
                  {new Date(strat.created_at).toISOString().split("T")[0]}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/strategies/${strat.id}/edit`)}
                      disabled={deletingId === strat.id}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(strat)}
                      disabled={deletingId === strat.id}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === strat.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StrategyTable;