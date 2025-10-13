// src/pages/StrategyDetail.tsx
import React, { useEffect, useState } from "react";
import OverviewTab from "../pages/OverviewTab.tsx";
import EquityTab from "../pages/EquityTab.tsx";
import PerformanceTab from "../pages/PerformanceTab.tsx";
import UploadTab from "../pages/UploadTab.tsx";
import { useNavigate, useParams } from "react-router-dom";
import { Strategy } from "../model/Strategy.ts";
import { fetchStrategyById } from "../services/strategyService.ts";
import MarketRegimeTab from "./MarketRegimeTab.tsx";


interface StrategyDetailProps {
  mode: "new" | "edit";
}

const StrategyDetail: React.FC<StrategyDetailProps> = ({ mode }) => {
  const [tab, setTab] = useState<"overview" | "marketRegime"| "equity" | "performance" | "upload">("overview");
    const navigate = useNavigate();
  const { id } = useParams();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode === "edit" && id) {
      fetchStrategyById(Number(id))
        .then(setStrategy)
        .finally(() => setLoading(false));
    }
  }, [mode, id]);

  if (loading) return <p className="p-6">Loading...</p>;


  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700 mb-1">
            Create New Strategy
          </h1>
          <p className="text-sm text-gray-500">
            Fill in the details to create a new strategy.
          </p>
        </div>
        <button
        onClick={() => navigate("/strategies")}
        className="px-4 py-2 bg-gray-200 text-blue-700 rounded-lg hover:bg-blue-300 transition"
        >
        ← Back to Dashboard
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex space-x-4 border-b pb-2 mb-4">
        {["overview","marketRegime", "equity", "performance", "upload"].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`pb-2 px-3 font-medium ${
              tab === key ? "border-b-2 border-indigo-600 text-indigo-700" : "text-gray-500"
            }`}
          >
            {key[0].toUpperCase() + key.slice(1)}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {tab === "overview" && (<OverviewTab mode={mode} strategy={strategy} onNext={(saved) => {setStrategy(saved);setTab("marketRegime");}}/>)}
      {tab === "marketRegime" && strategy && (
  <MarketRegimeTab strategy={strategy} />
)}
      {tab === "equity" && <EquityTab strategyId={id != null ? Number(id) : 0} />}
      {tab === "performance" && <PerformanceTab strategyId={id != null ? Number(id) : 0} />}
      {tab === "upload" && <UploadTab />}
    </div>
  );
};

export default StrategyDetail;
