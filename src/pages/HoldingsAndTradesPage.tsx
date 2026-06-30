// src/pages/HoldingsAndTradesPage.tsx
//
// F2: Strategy selector → tradelist + holdings view for one execution_enabled
// strategy. Trader can edit `current_stop_price` inline on LIVE rows; the
// engine reads it on the next nightly PM run via D3.
//
// Patch 40: dropdown gains "★ All Systems" — when selected, shows the combined
// PROPOSED + SUBSTITUTE_POOL basket across every execution_enabled strategy
// for the next business day, plus a Download button that emits the IBKR
// 18-column M_Combined_YYYYMMDD.csv basket file.
//
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    fetchExecutionEnabledStrategies,
    TradelistRow,
    fetchTradelistForStrategy,
    fetchBasketForDate,
    fetchLatestBasketDate,
    fetchAllLiveHoldings,
    combinedBasketCsvUrl,
    combinedBasketXlsxUrl,
    combinedSubCsvUrl,
    holdingsXlsxUrl,
    patchCurrentStopPrice,
    replayExecution,
    ReplayResult,
    brokerWrite,
    BrokerWriteSummary,
    ExecutionEnabledStrategy,
} from "../services/tradelistService.ts";

type Section = "holdings" | "pending" | "history";

const STATUS_TO_SECTION: Record<string, Section> = {
    LIVE: "holdings",
    PENDING_FILL: "pending",
    PROPOSED: "pending",
    EXITED: "history",
    CANCELLED: "history",
    EXPIRED: "history",
    SUBSTITUTE_POOL: "history",
};



// selectedId values: "" = nothing chosen, "all" = combined view, number = one strategy
type SelectedId = number | "" | "all";

const HoldingsAndTradesPage: React.FC = () => {
    const [strategies, setStrategies] = useState<ExecutionEnabledStrategy[]>([]);
    const [selectedId, setSelectedId] = useState<SelectedId>("");
    const [rows, setRows] = useState<TradelistRow[]>([]);
    const [liveHoldings, setLiveHoldings] = useState<TradelistRow[]>([]);
    // Patch 43: server-resolved trade_date for the "All Systems" view.
    // null = not yet fetched / no basket data exists.
    const [basketDate, setBasketDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [draftStop, setDraftStop] = useState<string>("");
    const [savingRow, setSavingRow] = useState<number | null>(null);
    // Patch 82: date-targeted LIVE execution replay (manual stepping for debugging)
    const [runDate, setRunDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [recomputeEquity, setRecomputeEquity] = useState<boolean>(true);
    const [replayRunning, setReplayRunning] = useState<boolean>(false);
    const [catchingUp, setCatchingUp] = useState<boolean>(false);
    const [replayResult, setReplayResult] = useState<ReplayResult | null>(null);
    const [replayError, setReplayError] = useState<string | null>(null);
    const [brokerWriting, setBrokerWriting] = useState<boolean>(false);   // Patch 84
    const [brokerResult, setBrokerResult] = useState<BrokerWriteSummary | null>(null);   // Patch 84

    // Load the dropdown
    useEffect(() => {
        fetchExecutionEnabledStrategies()
            .then(setStrategies)
            .catch((e) => setError(`Failed to load strategies: ${e.message ?? e}`));
    }, []);

    // Patch 40: parse dropdown value preserving "all" as a string. The
    // previous handler used Number(value) unconditionally which turned
    // "all" into NaN and broke the option.
    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const v = e.target.value;
        if (v === "") setSelectedId("");
        else if (v === "all") setSelectedId("all");
        else setSelectedId(Number(v));
    };

    // Load tradelist when a strategy is selected. "all" mode resolves the
    // latest trade_date server-side (adapts to wall-clock — pre-22:00
    // shows yesterday's run targeting today; post-nightly shows tonight's
    // run targeting tomorrow), then fetches that date's combined basket.
    const reload = useCallback(() => {
        if (selectedId === "") return;
        setLoading(true);
        setError(null);
        if (selectedId === "all") {
            setBasketDate(null);
            fetchAllLiveHoldings()
                .then(setLiveHoldings)
                .catch(() => setLiveHoldings([]));
            fetchLatestBasketDate()
                .then((d) => {
                    if (!d) {
                        setRows([]);
                        return;
                    }
                    setBasketDate(d);
                    return fetchBasketForDate(d).then(setRows);
                })
                .catch((e) => setError(`Failed to load combined basket: ${e.message ?? e}`))
                .finally(() => setLoading(false));
        } else {
            setBasketDate(null);
            fetchTradelistForStrategy(Number(selectedId), { ledger: "TRADED", limit: 500 })
                .then(setRows)
                .catch((e) => setError(`Failed to load tradelist: ${e.message ?? e}`))
                .finally(() => setLoading(false));
        }
    }, [selectedId]);

    useEffect(() => { reload(); }, [reload]);

    const sectioned = useMemo(() => {
        const out: Record<Section, TradelistRow[]> = { holdings: [], pending: [], history: [] };
        for (const r of rows) {
            const sec = STATUS_TO_SECTION[r.status] ?? "history";
            out[sec].push(r);
        }
        return out;
    }, [rows]);

    const startEdit = (r: TradelistRow) => {
        setEditingRowId(r.id);
        setDraftStop(r.current_stop_price != null ? String(r.current_stop_price) : "");
    };

    const cancelEdit = () => {
        setEditingRowId(null);
        setDraftStop("");
    };

    const saveEdit = async (r: TradelistRow) => {
        setSavingRow(r.id);
        try {
            const value = draftStop.trim() === "" ? null : Number(draftStop);
            if (value !== null && (!Number.isFinite(value) || value <= 0)) {
                setError("Stop price must be positive or empty (to clear).");
                return;
            }
            const updated = await patchCurrentStopPrice(r.id, value);
            setRows((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
            setEditingRowId(null);
            setDraftStop("");
        } catch (e: any) {
            const msg = e?.response?.data?.detail ?? e?.message ?? String(e);
            setError(`Failed to update stop: ${msg}`);
        } finally {
            setSavingRow(null);
        }
    };

    // Patch 82: run the REAL PM for one date (writes DB), then refresh the view.
    const runReplay = async (ds: string) => {
        if (typeof selectedId !== "number") return;
        setReplayRunning(true);
        setReplayError(null);
        try {
            const res = await replayExecution(selectedId, ds, { recomputeEquity });
            setReplayResult(res);
            reload();
        } catch (e: any) {
            const msg = e?.response?.data?.detail ?? e?.message ?? String(e);
            setReplayError(`Replay ${ds} failed: ${msg}`);
        } finally {
            setReplayRunning(false);
        }
    };

// Patch 84 + 85: broker-write = the "morning" promote step. Flips PROPOSED ->
    // PENDING_FILL and PENDING_EXIT -> EXIT_SUBMITTED and writes M_Combined_{date}.xlsx.
    // Patch 85: target the date the pending orders ACTUALLY carry, not the picker.
    // "Run execution for D" produces orders tagged D+1 (their execution date), so
    // broker_write must promote D+1 — picking D in the date box promoted nothing.
    // Read that date off the not-yet-promoted PROPOSED entries (or PENDING_EXIT
    // exits) so the button just works regardless of the picker.
    const runBrokerWrite = async () => {
        const proposed = rows.find(
            (r) => r.status === "PROPOSED" && r.intended_trade_date
        );
        const pendingExit = rows.find(
            (r) => r.status === "PENDING_EXIT" && r.exit_date
        );
        const target =
            proposed?.intended_trade_date ?? pendingExit?.exit_date ?? null;
        if (!target) {
            setReplayError(
                "Nothing pending to promote — no PROPOSED or PENDING_EXIT rows. " +
                "Run execution for a date first to generate orders."
            );
            return;
        }
        setBrokerWriting(true);
        setReplayError(null);
        try {
            const res = await brokerWrite(target);
            setBrokerResult(res);
            reload();
        } catch (e: any) {
            const msg = e?.response?.data?.detail ?? e?.message ?? String(e);
            setReplayError(`Broker write ${target} failed: ${msg}`);
        } finally {
            setBrokerWriting(false);
        }
    };

    // Step every weekday from runDate to today, in order. Halts on the first hard
    // error so you stay in control while debugging (weekends are skipped client-side;
    // a holiday with no data will surface as an error and stop the loop).
    const catchUp = async () => {
        if (typeof selectedId !== "number") return;
        setCatchingUp(true);
        setReplayError(null);
        const end = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
        let cur = new Date(runDate + "T00:00:00");
        let lastOk: string | null = null;
        while (cur <= end) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) {
                const ds = cur.toISOString().slice(0, 10);
                try {
                    const res = await replayExecution(selectedId, ds, { recomputeEquity });
                    setReplayResult(res);
                    lastOk = ds;
                    setRunDate(ds);
                } catch (e: any) {
                    const msg = e?.response?.data?.detail ?? e?.message ?? String(e);
                    setReplayError(`Stopped at ${ds}: ${msg}` + (lastOk ? ` (last good: ${lastOk})` : ""));
                    break;
                }
            }
            cur.setDate(cur.getDate() + 1);
        }
        setCatchingUp(false);
        reload();
    };

    const fmt = (v: number | null | undefined, d = 2) =>
        v == null ? "—" : Number(v).toFixed(d);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <Link
                to="/main"
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase hover:text-indigo-600 transition-colors mb-4"
            >
                ← Main menu
            </Link>
            <h1 className="text-2xl font-bold text-indigo-700 mb-4">
                Holdings & Tradelist
            </h1>

            {/* Strategy selector */}
            <div className="mb-6 flex items-center gap-3">
                <label className="font-medium text-gray-700">Strategy:</label>
                <select
                    className="px-3 py-2 border rounded-lg w-80"
                    value={selectedId}
                    onChange={onSelectChange}
                >
                    <option value="">— Select a strategy —</option>
                    <option value="all">★ All Systems (combined basket)</option>
                    {strategies.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name} ({s.system_type})
                            {s.production_capital ? ` · cap=${s.production_capital.toLocaleString()}` : ""}
                        </option>
                    ))}
                </select>
                {selectedId !== "" && (
                    <button
                        onClick={reload}
                        className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                    >
                        Refresh
                    </button>
                )}
            {selectedId === "all" && (
                <div className="flex gap-2 ml-auto">
                 <a   
                        href={holdingsXlsxUrl()}
                        download
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        ⬇ Download Holdings.xlsx
                    </a>
                    <a href={combinedBasketXlsxUrl(basketDate ?? new Date().toISOString().slice(0, 10))}
                        download
                        className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        ⬇ Download M_Combined.xlsx
                    </a>
                    <a
                        href={combinedSubCsvUrl(basketDate ?? new Date().toISOString().slice(0, 10))}
                        download
                        className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        ⬇ Download M_Combined_SUB.csv
                    </a>
                </div>
            )}
            </div>

            {/* Patch 82: date-targeted LIVE execution replay */}
            {typeof selectedId === "number" && (
                <div className="mb-6 rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-800">Run execution for a date</h2>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            manual replay → updates tradelist
                        </span>
                    </div>
                    <div className="p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <label className="text-sm font-semibold text-gray-700">Run date</label>
                            <input
                                type="date"
                                value={runDate}
                                onChange={(e) => setRunDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <label className="text-sm text-gray-600 ml-2 flex items-center gap-1.5">
                                <input
                                    type="checkbox"
                                    checked={recomputeEquity}
                                    onChange={(e) => setRecomputeEquity(e.target.checked)}
                                />
                                recompute equity after
                            </label>
                            <button
                                onClick={() => runReplay(runDate)}
                                disabled={replayRunning || catchingUp || brokerWriting}
                                className="px-4 py-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                            >
                                {replayRunning ? "Running…" : "Run execution"}
                            </button>
                            <button
                                onClick={() => runBrokerWrite()}
                                disabled={replayRunning || catchingUp || brokerWriting}
                                className="px-4 py-1.5 text-sm font-semibold bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                                title="Promote the pending PROPOSED→PENDING_FILL and PENDING_EXIT→EXIT_SUBMITTED orders (uses the orders' own trade date, not the picker) and write their M_Combined.xlsx"
                            >
                                {brokerWriting ? "Writing…" : "Broker write"}
                            </button>
                            <button
                                onClick={catchUp}
                                disabled={replayRunning || catchingUp || brokerWriting}
                                className="px-4 py-1.5 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                                {catchingUp ? "Stepping…" : "Catch up to today →"}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                            Runs the <b>real</b> Position Manager for the chosen date (writes the DB) — the same code
                            the nightly scheduler runs, on a date you pick. One session per run; walk forward in order.
                            Use it to step a missed session or replay a date while debugging a backtest/execution
                            mismatch.
                        </p>

                        {replayError && (
                            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
                                {replayError}
                            </div>
                        )}

                        {replayResult && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                                <b>Replay {replayResult.run_date} complete.</b>{" "}
                                {replayResult.summary.exits_applied} exits applied ·{" "}
                                {replayResult.summary.proposed_inserted} entries proposed ·{" "}
                                {(replayResult.summary.fills_resolved ?? 0) +
                                    (replayResult.summary.exit_fills_resolved ?? 0)}{" "}
                                fills resolved
                                {replayResult.refreshed_data ? " · data refreshed" : ""}
                                {replayResult.summary.execution_disabled && (
                                    <div className="text-amber-700 mt-1">
                                        ⚠ execution disabled: {replayResult.summary.execution_disable_reason}
                                    </div>
                                )}
                                {replayResult.broker && (
                                    <div className="text-xs text-green-700 mt-1">
                                        Promoted {replayResult.broker.promoted_proposed} entries +{" "}
                                        {replayResult.broker.exits_written} exits → wrote{" "}
                                        {replayResult.broker.file_path?.split(/[\\/]/).pop()}
                                    </div>
                                )}
                                <div className="text-xs text-green-700 mt-2">
                                    Holdings &amp; tradelist below refreshed. Equity{" "}
                                    {replayResult.equity && !replayResult.equity.error ? "recomputed" : "unchanged"}.
                                </div>
                            </div>
                        )}

                        {brokerResult && (
                            <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                                <b>Broker write {brokerResult.trade_date} done.</b>{" "}
                                Promoted {brokerResult.promoted_proposed} entries → PENDING_FILL ·{" "}
                                {brokerResult.exits_written} exits → EXIT_SUBMITTED ·{" "}
                                wrote M_Combined_{brokerResult.trade_date.replace(/-/g, "")}.xlsx
                                <div className="text-xs text-amber-700 mt-1">
                                    Those rows are now submitted. Run execution for this same date to
                                    resolve their fills (exit/entry prices land then).
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {selectedId === "" ? (
                <p className="text-gray-500">Choose a strategy above to view its tradelist.</p>
            ) : loading ? (
                <p className="text-gray-500">Loading…</p>
) : selectedId === "all" ? (
                <>
                {/* ── All Systems combined holdings ─────────────────────── */}
                <Section
                    title="Holdings (LIVE) — all systems"
                    count={liveHoldings.length}
                >
                    <Table>
                        <Head>
                            <Th>Strategy</Th><Th>Symbol</Th><Th>Dir</Th>
                            <Th>Qty</Th><Th>Entry date</Th><Th>Entry price</Th>
                            <Th>Initial stop</Th><Th>Current stop</Th>
                        </Head>
                        <tbody>
                            {liveHoldings.length === 0 && (
                                <tr><td colSpan={8} className="px-3 py-4 text-gray-400">
                                    No live holdings across any execution-enabled strategy.
                                </td></tr>
                            )}
                            {liveHoldings.map((r) => (
                                <tr key={r.id} className="border-t hover:bg-gray-50">
                                    <Td>{r.strategy_name ?? `#${r.strategy_id}`}</Td>
                                    <Td>{r.symbol}</Td>
                                    <Td><DirBadge dir={r.direction} /></Td>
                                    <Td>{r.filled_qty ?? r.intended_qty}</Td>
                                    <Td>{r.entry_date ?? "—"}</Td>
                                    <Td>{fmt(r.entry_price)}</Td>
                                    <Td>{fmt(r.initial_stop_price)}</Td>
                                    <Td className={r.current_stop_price != null ? "font-semibold text-indigo-700" : "text-gray-400"}>
                                        {r.current_stop_price != null ? fmt(r.current_stop_price) : "(recompute)"}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Section>

                {/* ── All Systems combined basket view ─────────────────────── */}
                <Section
                    title={
                        basketDate
                            ? `Combined basket — all systems (PROPOSED + SUBSTITUTE_POOL) for ${basketDate}`
                            : "Combined basket — all systems (PROPOSED + SUBSTITUTE_POOL)"
                    }
                    count={rows.length}
                >
                    <Table>
                        <Head>
                            <Th>Strategy</Th><Th>Symbol</Th><Th>Dir</Th><Th>Status</Th>
                            <Th>Qty</Th><Th>Limit price</Th><Th>Rank</Th><Th>Trade date</Th>
                        </Head>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td colSpan={8} className="px-3 py-4 text-gray-400">
                                    No basket for this date. Run the nightly first.
                                </td></tr>
                            )}
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t hover:bg-gray-50">
                                    <Td>{r.strategy_name ?? `#${r.strategy_id}`}</Td>
                                    <Td>{r.symbol}</Td>
                                    <Td><DirBadge dir={r.direction} /></Td>
                                    <Td><StatusBadge status={r.status} /></Td>
                                    <Td>{r.intended_qty}</Td>
                                    <Td>{fmt(r.limit_price)}</Td>
                                    <Td>{r.ranking_rank ?? "—"}</Td>
                                    <Td>{r.intended_trade_date ?? "—"}</Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Section>
                </>
            ) : (
                /* ── Single-strategy view (existing behavior) ────────────── */
                <>
                    {/* Holdings */}
                    <Section title="Holdings (LIVE)" count={sectioned.holdings.length}>
                        <Table>
                            <Head>
                                <Th>Symbol</Th><Th>Dir</Th><Th>Qty</Th>
                                <Th>Entry date</Th><Th>Entry price</Th>
                                <Th>Initial stop</Th><Th>Current stop (override)</Th>
                                <Th>Actions</Th>
                            </Head>
                            <tbody>
                                {sectioned.holdings.length === 0 && (
                                    <tr><td colSpan={8} className="px-3 py-4 text-gray-400">No live holdings.</td></tr>
                                )}
                                {sectioned.holdings.map((r) => (
                                    <tr key={r.id} className="border-t hover:bg-gray-50">
                                        <Td>{r.symbol}</Td>
                                        <Td><DirBadge dir={r.direction} /></Td>
                                        <Td>{r.filled_qty ?? r.intended_qty}</Td>
                                        <Td>{r.entry_date ?? "—"}</Td>
                                        <Td>{fmt(r.entry_price)}</Td>
                                        <Td>{fmt(r.initial_stop_price)}</Td>
                                        <Td>
                                            {editingRowId === r.id ? (
                                                <input
                                                    type="number" step="0.01" autoFocus
                                                    value={draftStop}
                                                    onChange={(e) => setDraftStop(e.target.value)}
                                                    placeholder="(blank = clear)"
                                                    className="w-32 px-2 py-1 border rounded text-sm"
                                                />
                                            ) : (
                                                <span className={r.current_stop_price != null ? "font-semibold text-indigo-700" : "text-gray-400"}>
                                                    {r.current_stop_price != null ? fmt(r.current_stop_price) : "(recompute)"}
                                                </span>
                                            )}
                                        </Td>
                                        <Td>
                                            {editingRowId === r.id ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        disabled={savingRow === r.id}
                                                        onClick={() => saveEdit(r)}
                                                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded disabled:opacity-50"
                                                    >Save</button>
                                                    <button
                                                        disabled={savingRow === r.id}
                                                        onClick={cancelEdit}
                                                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded"
                                                    >Cancel</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEdit(r)}
                                                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                                >Edit stop</button>
                                            )}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Section>

                    {/* Pending / Proposed */}
                    <Section title="Today's basket (PENDING_FILL + PROPOSED)" count={sectioned.pending.length}>
                        <Table>
                            <Head>
                                <Th>Symbol</Th><Th>Dir</Th><Th>Status</Th><Th>Qty</Th>
                                <Th>Limit price</Th><Th>Initial stop</Th><Th>Rank</Th><Th>Trade date</Th>
                            </Head>
                            <tbody>
                                {sectioned.pending.length === 0 && (
                                    <tr><td colSpan={8} className="px-3 py-4 text-gray-400">Nothing pending.</td></tr>
                                )}
                                {sectioned.pending.map((r) => (
                                    <tr key={r.id} className="border-t hover:bg-gray-50">
                                        <Td>{r.symbol}</Td>
                                        <Td><DirBadge dir={r.direction} /></Td>
                                        <Td><StatusBadge status={r.status} /></Td>
                                        <Td>{r.intended_qty}</Td>
                                        <Td>{fmt(r.limit_price)}</Td>
                                        <Td>{fmt(r.initial_stop_price)}</Td>
                                        <Td>{r.ranking_rank ?? "—"}</Td>
                                        <Td>{r.intended_trade_date ?? "—"}</Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Section>

                    {/* History */}
                    <Section title="History (EXITED · CANCELLED · EXPIRED)" count={sectioned.history.length}>
                        <Table>
                            <Head>
                                <Th>Symbol</Th><Th>Dir</Th><Th>Status</Th>
                                <Th>Entry date</Th><Th>Entry price</Th>
                                <Th>Exit date</Th><Th>Exit price</Th>
                                <Th>Exit reason</Th><Th>Profit</Th>
                            </Head>
                            <tbody>
                                {sectioned.history.length === 0 && (
                                    <tr><td colSpan={9} className="px-3 py-4 text-gray-400">No history yet.</td></tr>
                                )}
                                {sectioned.history.map((r) => (
                                    <tr key={r.id} className="border-t hover:bg-gray-50">
                                        <Td>{r.symbol}</Td>
                                        <Td><DirBadge dir={r.direction} /></Td>
                                        <Td><StatusBadge status={r.status} /></Td>
                                        <Td>{r.entry_date ?? "—"}</Td>
                                        <Td>{fmt(r.entry_price)}</Td>
                                        <Td>{r.exit_date ?? "—"}</Td>
                                        <Td>{fmt(r.exit_price)}</Td>
                                        <Td className="text-xs">{r.exit_reason ?? "—"}</Td>
                                        <Td className={(r.profit ?? 0) >= 0 ? "text-green-700" : "text-red-700"}>
                                            {fmt(r.profit)}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Section>
                </>
            )}
        </div>
    );
};

// ── tiny presentational helpers ──────────────────────────────────────────────
const Section: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => (
    <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
            {title} <span className="text-sm font-normal text-gray-500">({count})</span>
        </h2>
        {children}
    </div>
);
const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full text-sm">{children}</table>
    </div>
);
const Head: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
        <tr>{children}</tr>
    </thead>
);
const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <th className="px-3 py-2 text-left font-medium">{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string; colSpan?: number }> = ({ children, className, colSpan }) => (
    <td colSpan={colSpan} className={`px-3 py-2 ${className ?? ""}`}>{children}</td>
);
const DirBadge: React.FC<{ dir: string }> = ({ dir }) => (
    <span className={`px-2 py-0.5 text-xs rounded-full ${dir === "LONG" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>{dir}</span>
);
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const colors: Record<string, string> = {
        LIVE: "bg-blue-100 text-blue-700",
        PENDING_FILL: "bg-amber-100 text-amber-700",
        PROPOSED: "bg-amber-100 text-amber-700",
        SUBSTITUTE_POOL: "bg-gray-100 text-gray-600",
        EXITED: "bg-gray-100 text-gray-700",
        CANCELLED: "bg-gray-100 text-gray-500",
        EXPIRED: "bg-gray-100 text-gray-500",
    };
    return (
        <span className={`px-2 py-0.5 text-xs rounded-full ${colors[status] ?? "bg-gray-100 text-gray-700"}`}>
            {status}
        </span>
    );
};

export default HoldingsAndTradesPage;