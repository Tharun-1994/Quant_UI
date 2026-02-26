import React, { useState } from "react";
import { downloadEquity, downloadTradelist } from "../services/strategyService.ts";

interface DownloadTabProps {
  strategyId: number;
  systemName: string;
}

const DownloadTab: React.FC<DownloadTabProps> = ({ strategyId, systemName }) => {
  const [loading, setLoading] = useState<{ tradelist: boolean; equity: boolean }>({
    tradelist: false,
    equity: false,
  });
  const [error, setError] = useState<string | null>(null);


const handleDownload = async (fileType: "tradelist" | "equity") => {
  setError(null);
  setLoading((prev) => ({ ...prev, [fileType]: true }));

  try {
    const blob =
      fileType === "tradelist"
        ? await downloadTradelist(strategyId, systemName)
        : await downloadEquity(strategyId, systemName);

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${systemName}_${fileType}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    setError(err.response?.data?.detail ?? err.message ?? "Something went wrong");
  } finally {
    setLoading((prev) => ({ ...prev, [fileType]: false }));
  }
};

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-indigo-700 mb-1">Download Data</h2>
        <p className="text-sm text-gray-500">
          Download tradelist and equity curve data for&nbsp;
          <span className="font-medium text-gray-700">{systemName}</span>.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tradelist Card */}
        <div className="border rounded-lg p-5 flex flex-col items-center space-y-3">
          <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
          </svg>
          <h3 className="font-medium text-gray-800">Tradelist</h3>
          <p className="text-xs text-gray-500 text-center">All trades with entry/exit dates, prices, P&amp;L</p>
          <button
            onClick={() => handleDownload("tradelist")}
            disabled={loading.tradelist}
            className="mt-auto w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading.tradelist ? "Downloading…" : "Download CSV"}
          </button>
        </div>

        {/* Equity Card */}
        <div className="border rounded-lg p-5 flex flex-col items-center space-y-3">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
          </svg>
          <h3 className="font-medium text-gray-800">Equity Curve</h3>
          <p className="text-xs text-gray-500 text-center">Daily equity values for charting &amp; analysis</p>
          <button
            onClick={() => handleDownload("equity")}
            disabled={loading.equity}
            className="mt-auto w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {loading.equity ? "Downloading…" : "Download CSV"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadTab;
