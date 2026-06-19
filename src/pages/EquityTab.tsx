import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import { equityGraph, getBenchmarks } from "../services/strategyService.ts";

interface Props {
  strategyId: number;
}

interface Benchmark {
  key: string;
  label: string;
}

const EquityTab: React.FC<Props> = ({ strategyId }) => {
  const [data, setData] = useState<any[]>([]);
  const [layout, setLayout] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  // Patch 13: index-compare overlay state
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [activeBenchmark, setActiveBenchmark] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Load the list of available index benchmarks once (auto-discovered on the backend).
  useEffect(() => {
    getBenchmarks()
      .then((list) => {
        setBenchmarks(list);
        const spy = list.find((b) => b.key.toLowerCase() === "spy");
        setSelected(spy ? spy.key : list[0]?.key ?? "");
      })
      .catch(() => setBenchmarks([]));
  }, []);

  // (Re)load the equity figure, optionally with a benchmark overlay.
  useEffect(() => {
    setLoading(true);
    equityGraph(strategyId, activeBenchmark ?? undefined)
      .then((res) => {
        setData(res.data);
        setLayout(res.layout);
        setError(null);
      })
      .catch(() => setError("Failed to load equity data"))
      .finally(() => setLoading(false));
  }, [strategyId, activeBenchmark]);

  const hasBenchmarks = benchmarks.length > 0;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Equity Graph</h2>

        {hasBenchmarks && (
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={loading}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {benchmarks.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setActiveBenchmark(selected)}
              disabled={loading || !selected || activeBenchmark === selected}
              className="px-3 py-1 text-sm font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Compare
            </button>

            {activeBenchmark && (
              <button
                onClick={() => setActiveBenchmark(null)}
                disabled={loading}
                className="px-3 py-1 text-sm font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <Plot data={data} layout={layout} style={{ width: "100%", height: "800px" }} />
      )}
    </div>
  );
};

export default EquityTab;