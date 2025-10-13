import React, { useEffect, useState } from "react";

import { PerformanceMetrics } from "../model/Performance";
import { fetchPerformanceData } from "../services/strategyService.ts";

interface Props {
  strategyId: number;
}

const PerformanceTab: React.FC<Props> = ({ strategyId }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchPerformanceData(strategyId)
      .then((data) => {
        console.log("Fetched performance data:", data); // Debugging line
        setMetrics(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(false));
  }, [strategyId]);

  if (!loaded || !metrics) {
    return <p className="italic text-gray-500">Loading performance data…</p>;
  }

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

      {/* Yearly returns */}
      {metrics.yearly_returns?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Yearly Returns Comparison</h3>
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
      )}
    </div>
  );
};

export default PerformanceTab;
