
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  TradelistRow,
  fetchBasketForDate,
} from "../services/tradelistService.ts";

const todayIso = () => new Date().toISOString().slice(0, 10);

const BasketReviewPage: React.FC = () => {
  const [tradeDate, setTradeDate] = useState<string>(todayIso());
  const [rows, setRows] = useState<TradelistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchBasketForDate(tradeDate)
      .then(setRows)
      .catch((e) => setError(`Failed to load basket: ${e.message ?? e}`))
      .finally(() => setLoading(false));
  }, [tradeDate]);

  useEffect(() => { load(); }, [load]);

  const byStrategy = useMemo(() => {
    const out: Record<string, { proposed: TradelistRow[]; pool: TradelistRow[] }> = {};
    for (const r of rows) {
      const key = r.strategy_name ?? `sid${r.strategy_id}`;
      if (!out[key]) out[key] = { proposed: [], pool: [] };
      if (r.status === "PROPOSED") out[key].proposed.push(r);
      else if (r.status === "SUBSTITUTE_POOL") out[key].pool.push(r);
    }
    return out;
  }, [rows]);

  const fmt = (v: number | null | undefined, d = 2) =>
    v == null ? "—" : Number(v).toFixed(d);

  const strategyKeys = Object.keys(byStrategy).sort();

    return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link
        to="/main"
        className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 mb-3"
      >
        ← Back to Main
      </Link>
      <h1 className="text-2xl font-bold text-indigo-700 mb-4">Basket Review</h1>

      <div className="mb-6 flex items-center gap-3">
        <label className="font-medium text-gray-700">Trade date:</label>
        <input
          type="date"
          value={tradeDate}
          onChange={(e) => setTradeDate(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <button
          onClick={load}
          className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
        >
          Refresh
        </button>
        <div className="ml-auto text-sm text-gray-500">
          Total rows: <span className="font-semibold">{rows.length}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : strategyKeys.length === 0 ? (
        <p className="text-gray-500">No PROPOSED or SUBSTITUTE_POOL rows for this date.</p>
      ) : (
        strategyKeys.map((sname) => {
          const grp = byStrategy[sname];
          return (
            <div key={sname} className="mb-8 border border-gray-200 rounded-lg bg-white">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  {sname}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    · {grp.proposed.length} proposed · {grp.pool.length} in pool
                  </span>
                </h2>
              </div>

              <div className="px-4 pt-3 pb-1 font-medium text-xs uppercase text-gray-500">
                Proposed (will fire on broker write)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Rank</th>
                      <th className="px-3 py-2 text-left font-medium">Symbol</th>
                      <th className="px-3 py-2 text-left font-medium">Direction</th>
                      <th className="px-3 py-2 text-left font-medium">Qty</th>
                      <th className="px-3 py-2 text-left font-medium">Capital</th>
                      <th className="px-3 py-2 text-left font-medium">Limit price</th>
                      <th className="px-3 py-2 text-left font-medium">Initial stop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grp.proposed.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-3 text-gray-400">No proposed orders.</td></tr>
                    )}
                    {grp.proposed.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">{r.ranking_rank ?? "—"}</td>
                        <td className="px-3 py-2 font-medium">{r.symbol}</td>
                        <td className="px-3 py-2">{r.direction}</td>
                        <td className="px-3 py-2">{r.intended_qty}</td>
                        <td className="px-3 py-2">{fmt(r.intended_capital, 0)}</td>
                        <td className="px-3 py-2">{fmt(r.limit_price)}</td>
                        <td className="px-3 py-2">{fmt(r.initial_stop_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {grp.pool.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1 font-medium text-xs uppercase text-gray-500 border-t">
                    Substitute pool (available for swap-in via CSV)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Rank</th>
                          <th className="px-3 py-2 text-left font-medium">Symbol</th>
                          <th className="px-3 py-2 text-left font-medium">Direction</th>
                          <th className="px-3 py-2 text-left font-medium">Qty</th>
                          <th className="px-3 py-2 text-left font-medium">Limit price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grp.pool.map((r) => (
                          <tr key={r.id} className="border-t hover:bg-gray-50 text-gray-700">
                            <td className="px-3 py-2">{r.ranking_rank ?? "—"}</td>
                            <td className="px-3 py-2">{r.symbol}</td>
                            <td className="px-3 py-2">{r.direction}</td>
                            <td className="px-3 py-2">{r.intended_qty}</td>
                            <td className="px-3 py-2">{fmt(r.limit_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default BasketReviewPage;