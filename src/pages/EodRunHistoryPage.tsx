import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  EodRunLogRow,
  fetchEodRunLog,
  retryEodRunLogStep,
  revertExecution,          // Patch 112
  triggerNightly,
  triggerMorning,
  triggerNightlyTest, TestTriggerNightlyRequest,
  triggerNightlyTestWithCsv, TestTriggerNightlyResponse,
} from "../services/eodRunLogService.ts";
import API from "../config/api.ts";

const EodRunHistoryPage: React.FC = () => {
  const [rows, setRows] = useState<EodRunLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [filter, setFilter] = useState<{ status: string; step: string; from_date: string }>({ status: "", step: "", from_date: today });
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<"nightly" | "morning" | null>(null);
  const [confirm, setConfirm] = useState<"nightly" | "morning" | null>(null);

  const [testModal, setTestModal] = useState(false);
  const [testDate, setTestDate] = useState<string>("");
  const [testStrategyId, setTestStrategyId] = useState<string>("");
  const [strategies, setStrategies] = useState<{ id: number; name: string }[]>([]);
  const [testCsvFile, setTestCsvFile] = useState<File | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testRunning, setTestRunning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchEodRunLog({
      status_filter: filter.status || undefined,
      step_filter: filter.step || undefined,
      from_date: filter.from_date || undefined,
      limit: 200,
    })
      .then(setRows)
      .catch((e) => setError(`Failed to load run log: ${e.message ?? e}`))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

const handleTrigger = async (kind: "nightly" | "morning") => {
    setConfirm(null);
    setTriggering(kind);
    setRetryMsg(null);
    try {
      const res = kind === "nightly" ? await triggerNightly() : await triggerMorning();
      setRetryMsg(`${kind === "nightly" ? "Nightly" : "Morning"} started (pid=${res.pid}). ${res.message}`);
      // Give the child a moment to start writing rows
      setTimeout(load, 1500);
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? String(e);
      setRetryMsg(`Failed to start ${kind}: ${msg}`);
    } finally {
      setTriggering(null);
    }
  };

    useEffect(() => {
    API.get<{ id: number; name: string; execution_enabled?: boolean }[]>("/strategies")
        .then((res) => {
        setStrategies(
            res.data
            .filter((s) => s.execution_enabled !== false)
            .map((s) => ({ id: s.id, name: s.name }))
        );
        })
        .catch(() => {}); // non-critical — dropdown just stays empty
    }, []);
  // Patch 112: revert the latest SUCCESS execution_step run for the row's
  // strategy+date. Confirm first — this restores the tradelist to its
  // pre-run state and deletes that run's PROPOSED/POOL generation.
  const handleRevert = async (row: EodRunLogRow) => {
    if (row.strategy_id == null) return;
    const ok = window.confirm(
      `Revert execution for ${row.strategy_name ?? `sid${row.strategy_id}`} ` +
      `on ${row.run_date}?\n\nThis restores the tradelist to its state ` +
      `BEFORE this run (fills, exits, stop/TP updates undone) and deletes ` +
      `the proposals it created. Only the latest run per strategy can be ` +
      `reverted. Re-run afterwards via "Run execution for a date".`
    );
    if (!ok) return;
    setRetryingId(row.id);
    setRetryMsg(null);
    try {
      const res = await revertExecution(row.strategy_id, row.run_date);
      setRetryMsg(
        `Reverted (log ${res.log_id}): ${res.rows_restored} restored, ` +
        `${res.rows_recreated} recreated, ${res.rows_deleted} deleted. ${res.note}`
      );
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setRetryMsg(`Revert failed: ${msg}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetry = async (row: EodRunLogRow) => {
    setRetryingId(row.id);
    setRetryMsg(null);
    try {
      const res = await retryEodRunLogStep(row.id);
      setRetryMsg(`Retry succeeded: ${res.detail}`);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? String(e);
      setRetryMsg(`Retry failed: ${msg}`);
    } finally {
      setRetryingId(null);
    }
  };

  const fmtTs = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");
  const canRetry = (r: EodRunLogRow) => r.status === "FAILED" && r.step !== "overlay_apply";

return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link
        to="/main"
        className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase hover:text-indigo-600 transition-colors mb-4"
      >
        ← Main menu
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-indigo-700">EOD Run History</h1>
        <div className="flex gap-2">
          <button
            disabled={triggering !== null}
            onClick={() => setConfirm("nightly")}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded shadow hover:bg-purple-700 disabled:opacity-50"
          >
            {triggering === "nightly" ? "Starting…" : "▶ Trigger Nightly"}
          </button>
          <button
            disabled={triggering !== null}
            onClick={() => setConfirm("morning")}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded shadow hover:bg-teal-700 disabled:opacity-50"
          >
            {triggering === "morning" ? "Starting…" : "▶ Trigger Morning"}
          </button>
          {/* ADD this button next to the existing ones */}
<button
  disabled={triggering !== null}
  onClick={() => setTestModal(true)}
  className="px-4 py-2 text-sm bg-orange-600 text-white rounded shadow hover:bg-orange-700 disabled:opacity-50"
>
  🧪 Test Trigger Nightly
</button>



{testModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        🧪 Test Trigger Nightly
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Replays exec_data_refresh + PM for a historical date.
        Upload the backtest tradelist to seed live positions rescaled to
        production capital — tests entries, exits, dedup, and sector caps.
      </p>

      {/* Step 1: Date */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          1. Close date (prices as of this date)
        </label>
        <input
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          className="w-full border rounded px-3 py-1.5 text-sm"
        />
        {testDate && (
          <p className="text-xs text-gray-400 mt-1">
            Signals target next trading day after <strong>{testDate}</strong>
          </p>
        )}
      </div>

      {/* Step 2: Strategy */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          2. Strategy
        </label>
        <select
          value={testStrategyId}
          onChange={(e) => setTestStrategyId(e.target.value)}
          className="w-full border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All execution-enabled strategies</option>
          {strategies.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Step 3: Tradelist CSV */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          3. Backtest tradelist CSV{" "}
          <span className="text-gray-400 font-normal">(optional — omit for cold start)</span>
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setTestCsvFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-3
                     file:rounded file:border-0 file:text-sm file:bg-orange-50
                     file:text-orange-700 hover:file:bg-orange-100"
        />
        {testCsvFile && (
          <p className="text-xs text-green-700 mt-1">
            ✓ {testCsvFile.name} — positions open on selected date will be
            seeded at production capital scale
          </p>
        )}
        {!testCsvFile && (
          <p className="text-xs text-gray-400 mt-1">
            No file — cold start (no live positions seeded, entries only)
          </p>
        )}
      </div>

      {/* Results area */}
      {testResult && (
        <div className={`mb-4 p-3 rounded border text-xs ${
          testResult.status === 'SUCCESS'
            ? 'bg-green-50 border-green-200 text-green-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="font-semibold mb-1">
            {testResult.status} — run_date={testResult.run_date} → trade_date={testResult.trade_date}
          </div>
          {testResult.results?.map((r: any, i: number) => (
            <div key={i} className="mt-1 pl-2 border-l-2 border-current">
              <span className="font-medium">{r.strategy_name}</span>:{" "}
              {r.status === 'SUCCESS'
                ? `✓ ${r.entries_count} entries, ${r.exits_count} exits, ${r.holdings_seeded} seeded`
                : `✗ ${r.error}`}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setTestModal(false);
            setTestDate("");
            setTestStrategyId("");
            setTestCsvFile(null);
            setTestResult(null);
          }}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Close
        </button>
        <button
          disabled={!testDate || testRunning}
          onClick={async () => {
            setTestRunning(true);
            setTestResult(null);
            try {
              let csvText: string | null = null;
              if (testCsvFile) {
                csvText = await testCsvFile.text();
              }
              const res = await triggerNightlyTestWithCsv(
                testDate,
                testStrategyId ? Number(testStrategyId) : undefined,
                csvText,
              );
              setTestResult(res);
            } catch (e: any) {
              const msg = e?.response?.data?.detail ?? e?.message ?? String(e);
              setTestResult({ status: 'FAILED', results: [{ status: 'FAILED', error: msg }] });
            } finally {
              setTestRunning(false);
            }
          }}
          className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
        >
          {testRunning ? "Running…" : "▶ Start Test"}
        </button>
      </div>
    </div>
  </div>
)}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Confirm {confirm === "nightly" ? "Nightly" : "Morning"} Trigger
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              {confirm === "nightly"
                ? "This will run the full nightly chain: universe pipeline → exec_data refresh → PM per execution-enabled strategy. Can take several minutes."
                : "This will run the morning chain: overlay-apply per CSV → broker-write to emit M_Combined.xlsx for today."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTrigger(confirm)}
                className={`px-3 py-1 text-sm text-white rounded ${
                  confirm === "nightly" ? "bg-purple-600 hover:bg-purple-700" : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                Confirm & Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm text-gray-700">Status:</label>
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="px-2 py-1 border rounded text-sm"
        >
          <option value="">All</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="RUNNING">RUNNING</option>
        </select>

        <label className="text-sm text-gray-700 ml-3">Step:</label>
        <select
          value={filter.step}
          onChange={(e) => setFilter((f) => ({ ...f, step: e.target.value }))}
          className="px-2 py-1 border rounded text-sm"
        >
          <option value="">All</option>
          <option value="exec_data_refresh">exec_data_refresh</option>
          <option value="execution_step">execution_step</option>
          <option value="overlay_apply">overlay_apply</option>
          <option value="broker_write">broker_write</option>
        </select>

        <label className="text-sm text-gray-700 ml-3">From date:</label>
        <input
          type="date"
          value={filter.from_date}
          onChange={(e) => setFilter((f) => ({ ...f, from_date: e.target.value }))}
          className="px-2 py-1 border rounded text-sm"
        />
        <button
          onClick={() => setFilter((f) => ({ ...f, from_date: "" }))}
          className="text-xs text-gray-400 hover:text-gray-700 px-1"
          title="Clear date filter"
        >
          ✕ clear
        </button>

        <button
          onClick={load}
          className="px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
        >
          Refresh
        </button>
      </div>

      {retryMsg && (
        <div className="mb-3 p-2 bg-blue-50 text-blue-800 rounded border border-blue-200 text-sm">
          {retryMsg}
        </div>
      )}

      {error && (
        <div className="mb-3 p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">ID</th>
              <th className="px-3 py-2 text-left font-medium">Run date</th>
              <th className="px-3 py-2 text-left font-medium">Step</th>
              <th className="px-3 py-2 text-left font-medium">Strategy</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Rows</th>
              <th className="px-3 py-2 text-left font-medium">Started</th>
              <th className="px-3 py-2 text-left font-medium">Finished</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-3 py-4 text-gray-500">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-4 text-gray-400">No run-log rows.</td></tr>
            )}
            {rows.map((r) => (
              <React.Fragment key={r.id}>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{r.id}</td>
                  <td className="px-3 py-2">{r.run_date}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.step}</td>
                  <td className="px-3 py-2">{r.strategy_name ?? (r.strategy_id != null ? `sid${r.strategy_id}` : "—")}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      r.status === "SUCCESS" ? "bg-green-100 text-green-700" :
                      r.status === "FAILED"  ? "bg-red-100 text-red-700" :
                                               "bg-amber-100 text-amber-700"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2">{r.rows_affected ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{fmtTs(r.started_at)}</td>
                  <td className="px-3 py-2 text-xs">{fmtTs(r.finished_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {r.error_msg && (
                        <button
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {expandedId === r.id ? "Hide" : "View error"}
                        </button>
                      )}
                      {canRetry(r) && (
                        <button
                          disabled={retryingId === r.id}
                          onClick={() => handleRetry(r)}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded disabled:opacity-50"
                        >
                          {retryingId === r.id ? "Retrying…" : "Retry"}
                        </button>
                      )}
                      {/* Patch 112: revert — only meaningful on successful
                          execution_step runs (journal exists per run). */}
                      {r.step === "execution_step" &&
                        r.status === "SUCCESS" &&
                        r.strategy_id != null && (
                        <button
                          disabled={retryingId === r.id}
                          onClick={() => handleRevert(r)}
                          className="px-2 py-1 text-xs bg-amber-600 text-white rounded disabled:opacity-50"
                        >
                          {retryingId === r.id ? "Working…" : "Revert"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === r.id && r.error_msg && (
                  <tr>
                    <td colSpan={9} className="px-3 py-2 bg-red-50 border-t border-red-100">
                      <pre className="whitespace-pre-wrap text-xs text-red-900">{r.error_msg}</pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EodRunHistoryPage;