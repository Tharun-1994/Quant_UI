import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../config/api.ts";

interface Exclusion {
  id: number;
  ticker: string;
  reason: string | null;
  added_by: string | null;
  added_at: string;
  active: boolean;
}

const UniverseExclusionsPage: React.FC = () => {
  const [rows, setRows]           = useState<Exclusion[]>([]);
  const [loading, setLoading]     = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [newReason, setNewReason] = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    API.get<Exclusion[]>("/universe/exclusions")
      .then((r) => setRows(r.data))
      .catch((e) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const t = newTicker.trim().toUpperCase();
    if (!t) return;
    setSaving(true);
    setError(null);
    try {
      await API.post("/universe/exclusions", { ticker: t, reason: newReason || null, added_by: "ui" });
      setNewTicker("");
      setNewReason("");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await API.delete(`/universe/exclusions/${id}`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to remove");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await API.put(`/universe/exclusions/${id}/restore`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? "Failed to restore");
    }
  };

  const active   = rows.filter((r) => r.active);
  const inactive = rows.filter((r) => !r.active);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/main" className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase hover:text-indigo-600 transition-colors mb-4">
        ← Main menu
      </Link>
      <h1 className="text-2xl font-bold text-indigo-700 mt-2 mb-1">
        Universe Ticker Exclusions
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Tickers listed here are removed from ALL universe parquets before
        backtest and execution. Changes take effect on the next nightly run.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Add form */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add ticker</h2>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ticker</label>
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder="e.g. GOOG"
              className="border rounded px-3 py-2 text-sm font-mono uppercase w-32"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g. dual-class share, delisted, low float"
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTicker.trim() || saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>

      {/* Active exclusions */}
      <div className="border rounded-lg bg-white mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="text-sm font-semibold text-gray-800">
            Active exclusions{" "}
            <span className="text-gray-400 font-normal">· {active.length} tickers</span>
          </h2>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Loading…</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-2 text-left">Ticker</th>
                <th className="px-4 py-2 text-left">Reason</th>
                <th className="px-4 py-2 text-left">Added by</th>
                <th className="px-4 py-2 text-left">Added at</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-gray-400 text-center">
                    No active exclusions
                  </td>
                </tr>
              ) : (
                active.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono font-medium">{r.ticker}</td>
                    <td className="px-4 py-2 text-gray-600">{r.reason || "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{r.added_by || "—"}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{r.added_at.slice(0, 10)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleDeactivate(r.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Inactive (soft-deleted) */}
      {inactive.length > 0 && (
        <div className="border rounded-lg bg-white">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="text-sm font-semibold text-gray-400">
              Inactive (removed) · {inactive.length}
            </h2>
          </div>
          <table className="min-w-full text-sm">
            <tbody>
              {inactive.map((r) => (
                <tr key={r.id} className="border-t text-gray-400">
                  <td className="px-4 py-2 font-mono line-through">{r.ticker}</td>
                  <td className="px-4 py-2">{r.reason || "—"}</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleRestore(r.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UniverseExclusionsPage;