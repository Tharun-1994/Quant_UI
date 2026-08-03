import React, { useState, useEffect } from "react";
import {
  downloadEquity,
  downloadTradelist,
  fetchInputFiles,
  downloadInputFile,
  InputFile,
} from "../services/strategyService.ts";

interface DownloadTabProps {
  strategyId: number;
  systemName: string;
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  indicator: {
    label: "Indicators",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  },
  prices: {
    label: "Price Data",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  dates: {
    label: "Date Files",
    color: "text-violet-600 bg-violet-50 border-violet-200",
    icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
  },
  universe: {
    label: "Universe",
    color: "text-teal-600 bg-teal-50 border-teal-200",
    icon: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418",
  },
};

const DownloadTab: React.FC<DownloadTabProps> = ({ strategyId, systemName }) => {
  const [loading, setLoading] = useState<Record<string, boolean>>({
    tradelist: false,
    equity: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Fetch input files on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingFiles(true);
    fetchInputFiles(strategyId, systemName)
      .then((files) => {
        if (!cancelled) setInputFiles(files);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.detail ?? "Failed to list input files");
      })
      .finally(() => {
        if (!cancelled) setLoadingFiles(false);
      });
    return () => { cancelled = true; };
  }, [strategyId, systemName]);

  const handleDownload = async (fileType: "tradelist" | "equity") => {
    setError(null);
    setLoading((prev) => ({ ...prev, [fileType]: true }));
    try {
      const blob =
        fileType === "tradelist"
          ? await downloadTradelist(strategyId, systemName)
          : await downloadEquity(strategyId, systemName);

      triggerDownload(blob, `${systemName}_${fileType}.csv`);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? "Something went wrong");
    } finally {
      setLoading((prev) => ({ ...prev, [fileType]: false }));
    }
  };

  const handleInputDownload = async (file: InputFile) => {
    setError(null);
    setLoading((prev) => ({ ...prev, [file.filename]: true }));
    try {
      const blob = await downloadInputFile(strategyId, systemName, file.filename);
      triggerDownload(blob, `${systemName}_${file.name}.csv`);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? "Something went wrong");
    } finally {
      setLoading((prev) => ({ ...prev, [file.filename]: false }));
    }
  };

  const handleDownloadAll = async () => {
    setError(null);
    for (const file of inputFiles) {
      await handleInputDownload(file);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Group files by category
  const grouped = inputFiles.reduce<Record<string, InputFile[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});

  const formatSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`);

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-8">
      {/* ── Header ─────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold text-indigo-700 mb-1">Download Data</h2>
        <p className="text-sm text-gray-500">
          Download outputs and input data for&nbsp;
          <span className="font-medium text-gray-700">{systemName}</span>.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Output Files (existing) ────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Backtest Output
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <OutputCard
            title="Tradelist"
            description="All trades with entry/exit dates, prices, P&L"
            color="indigo"
            loading={loading.tradelist}
            onClick={() => handleDownload("tradelist")}
          />
          <OutputCard
            title="Equity Curve"
            description="Daily equity values for charting & analysis"
            color="emerald"
            loading={loading.equity}
            onClick={() => handleDownload("equity")}
          />
        </div>
      </div>

      {/* ── Input Files (new) ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Input Data &amp; Indicators
          </h3>
          {inputFiles.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition"
            >
              Download All ({inputFiles.length} files)
            </button>
          )}
        </div>

        {loadingFiles ? (
          <div className="text-sm text-gray-400 py-8 text-center">Loading input files…</div>
        ) : inputFiles.length === 0 ? (
          <div className="text-sm text-gray-400 py-8 text-center">
            No input files found for this strategy.
          </div>
        ) : (
          <div className="space-y-5">
            {["indicator", "prices", "dates", "universe"].map((cat) => {
              const files = grouped[cat];
              if (!files?.length) return null;
              const meta = CATEGORY_META[cat];

              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className={`w-4 h-4 ${meta.color.split(" ")[0]}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {meta.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {files.map((file) => (
                      <button
                        key={file.filename}
                        onClick={() => handleInputDownload(file)}
                        disabled={loading[file.filename]}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg border
                          ${meta.color} hover:shadow-sm transition text-left group
                          disabled:opacity-50`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs opacity-60">{formatSize(file.size_kb)}</p>
                        </div>
                        <svg
                          className="w-4 h-4 flex-shrink-0 ml-2 opacity-40 group-hover:opacity-100 transition"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Small helper component for output cards ──────── */
function OutputCard({
  title,
  description,
  color,
  loading,
  onClick,
}: {
  title: string;
  description: string;
  color: "indigo" | "emerald";
  loading: boolean;
  onClick: () => void;
}) {
  const btnClass =
    color === "indigo"
      ? "bg-indigo-600 hover:bg-indigo-700"
      : "bg-emerald-600 hover:bg-emerald-700";
  const iconClass = color === "indigo" ? "text-indigo-500" : "text-emerald-500";

  return (
    <div className="border rounded-lg p-5 flex flex-col items-center space-y-3">
      <svg
        className={`w-10 h-10 ${iconClass}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3"
        />
      </svg>
      <h3 className="font-medium text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500 text-center">{description}</p>
      <button
        onClick={onClick}
        disabled={loading}
        className={`mt-auto w-full px-4 py-2 ${btnClass} text-white rounded-lg disabled:opacity-50 transition`}
      >
        {loading ? "Downloading…" : "Download CSV"}
      </button>
    </div>
  );
}

export default DownloadTab;
