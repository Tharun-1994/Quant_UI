// src/pages/StrategyTable.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Strategy } from "../model/Strategy.ts";
import { fetchStrategies } from "../services/strategyService.ts";

const StrategyTable: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStrategies()
      .then(setStrategies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="p-6">Loading strategies...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-500">Error: {error}</p>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700 mb-1">
            Strategy Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            View and manage your saved strategies.
          </p>
        </div>
        <button
          onClick={() => navigate("/strategies/new")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
        >
          + New Strategy
        </button>
      </header>

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
                  <button
                    onClick={() => navigate(`/strategies/${strat.id}/edit`)}
                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Edit
                  </button>
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
