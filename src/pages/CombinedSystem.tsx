// Patch 145: combined-system page — 122 form design + CONFIGURABLE market
// condition labels. The hardcoded BULL/BEAR panels are replaced by a
// "Market conditions" card where the operator defines labels (name + rule
// on the condition ticker); each label then gets its own sizing panel and
// its own gate threshold panel. Rules use the same leaf shape as entry
// rules. The last label is always the default ("everything else").
import { useEffect, useState } from "react";
import { fetchStrategies } from "../services/strategyService.ts";
import {
  CombinedMember, MemberOverrides,
  fetchCombined, saveCombined, simulateCombined,
  executeCombined,   // Patch 147
} from "../services/combinedService.ts";
import RulesTreeEditor from "../pages/RuleTreeEditor.tsx";   // Patch 142
import { useIndicatorRegistry } from "../context/IndicatorRegistry.tsx"; // Patch 144
import { INDEX_TICKERS } from "../constants/options.ts";                 // Patch 144
const emptyTree = () => ({ type: "group", id: "root", logic: "AND", children: [] as any[] });
const leafTree = (rule: any) => ({ type: "group", id: "root", logic: "AND",
  children: [{ type: "rule", id: `r${Date.now()}`, rule }] });

interface StrategyLite { id: number; name: string }

interface ConditionRule {
  indicator: string; lookback: number; operator: string;
  value: number; value_type: "value" | "indicator_price";
  value_indicator: string; value_lookback: number;
}
interface ConditionLabel { label: string; rule_tree: any | null }

const PALETTE = [
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: "🐂" },
  { bg: "bg-rose-50",    border: "border-rose-200",    text: "text-rose-800",    icon: "🐻" },
  { bg: "bg-sky-50",     border: "border-sky-200",     text: "text-sky-800",     icon: "🌊" },
  { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",   icon: "⚡" },
];

const INDICATORS = ["close", "sma", "roc", "ibs"];
const OPERATORS = [">", "<", ">=", "<="];

const defaultConfig = {
  capital: 25000, base_slots: 8, slot_divisor: 3, max_slots: 32,
  max_per_ticker: 3, min_to_enter: 2, count_basis: "candidates",
  // Patch 146: production (live execution) profile — read by the execution
  // path only; Simulate uses the research fields above.
  production_capital: 25000, production_min_to_enter: 2,
  closes_parquet_relpath: "DAILY_closes.parquet",
  gate: { enabled: true, ticker: "spy" },
  ladder: { base: 2.0, seed_count: { "1": 1.5, "2": 0.5 } },
  // Patch 130: a NEW combined starts minimal — one neutral catch-all label,
  // nothing pre-seeded. The operator adds conditions themselves.
  market_conditions: {
    ticker: "spy",
    labels: [
      { label: "all_days", rule_tree: null },
    ] as ConditionLabel[],
  },
  ladder_by_label: {
    all_days: { second_buy: 1.0, third_buy: 1.0 },
  } as Record<string, { second_buy: number; third_buy: number }>,
  gate_by_label: {
    all_days: { rule_tree: leafTree({ indicator: "ibs", lookback: 0, operator: "<",
      value: 0.95, value_type: "value", value_indicator: "", value_lookback: 0,
      label: "", connector: "" }) },
  } as Record<string, { rule_tree: any }>,
};

export default function CombinedSystem({ combinedId }: { combinedId: number }) {
  const [allStrategies, setAllStrategies] = useState<StrategyLite[]>([]);
  const [members, setMembers] = useState<CombinedMember[]>([]);
  const [cfg, setCfg] = useState<any>(defaultConfig);
  const [addId, setAddId] = useState<number | "">("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  // Patch 144: same registry-driven lists as the Normal-strategy regime
  // editor — conditions/gates mimic Market Trend Rules exactly.
  const { indicatorsFor } = useIndicatorRegistry();
  // Patch 145: conditions mimic Market Trend Rules (market_regime context);
  // the GATE mimics Entry/Exit rules (entry lhs/rhs contexts) — verbatim
  // the props RegimeCard uses at its entry-editor mount.
  const conditionIndicators = indicatorsFor("Normal", "market_regime", "lhs");
  const gateIndicatorsLhs = indicatorsFor("Normal", "entry", "lhs");
  const gateIndicatorsRhs = indicatorsFor("Normal", "entry", "rhs");
  // Patch 128: label names are edited in a local draft and committed on
  // blur/Enter — renaming per keystroke rejected empty strings (backspace
  // couldn't clear the field) and churned ladder/gate keys on every char.
  const [draftNames, setDraftNames] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchStrategies();
        setAllStrategies(list.map((s: any) => ({ id: s.id, name: s.name })));
      } catch (e: any) {
        setError(`Could not load strategies list: ${e.message ?? e}`);
      }
      try {
        const d = await fetchCombined(combinedId);
        setMembers((d.members ?? []).map(m => ({ ...m, overrides: m.overrides ?? null })));
        if (d.config) setCfg({ ...defaultConfig, ...d.config });
      } catch (e: any) {
        setError(prev => prev || `Could not load combined config: ${e.message ?? e}`);
      }
    })();
  }, [combinedId]);

  const nameOf = (id: number) => allStrategies.find(s => s.id === id)?.name ?? `#${id}`;
  const labels: ConditionLabel[] = cfg.market_conditions?.labels ?? [];
  const paletteOf = (i: number) => PALETTE[i % PALETTE.length];

  // ── config setters ────────────────────────────────────────────────────────
  const setCfgDeep = (mutate: (next: any) => void) => {
    const next = JSON.parse(JSON.stringify(cfg));
    mutate(next);
    setCfg(next);
  };
  const setC = (path: string, raw: string | boolean) => setCfgDeep(next => {
    const keys = path.split(".");
    let o = next;
    for (const k of keys.slice(0, -1)) o = o[k];
    o[keys[keys.length - 1]] =
      typeof raw === "boolean" ? raw : (isNaN(Number(raw)) ? raw : Number(raw));
  });

  // ── label operations (keep ladder_by_label / gate_by_label keys in sync) ──
  const renameLabel = (idx: number, newName: string) => setCfgDeep(next => {
    const old = next.market_conditions.labels[idx].label;
    if (!newName || newName === old) return;
    if (next.market_conditions.labels.some((l: any, i: number) => i !== idx && l.label === newName)) return;
    next.market_conditions.labels[idx].label = newName;
    next.ladder_by_label[newName] = next.ladder_by_label[old] ?? { second_buy: 1.0, third_buy: 1.0 };
    next.gate_by_label[newName] = next.gate_by_label[old] ?? { rule_tree: leafTree({
      indicator: "ibs", lookback: 0, operator: "<", value: 0.95,
      value_type: "value", value_indicator: "", value_lookback: 0,
      label: "", connector: "" }) };
    delete next.ladder_by_label[old];
    delete next.gate_by_label[old];
  });

  const addLabel = () => setCfgDeep(next => {
    let n = 1;
    while (next.market_conditions.labels.some((l: any) => l.label === `condition_${n}`)) n++;
    const name = `condition_${n}`;
    // insert BEFORE the default (last) label — defaults stay last
    next.market_conditions.labels.splice(next.market_conditions.labels.length - 1, 0, {
      label: name,
      rule_tree: leafTree({ indicator: "close", lookback: 0, operator: ">",
        value: 0, value_type: "indicator_price", value_indicator: "sma",
        value_lookback: 200, label: "", connector: "" }),
    });
    next.ladder_by_label[name] = { second_buy: 1.0, third_buy: 1.0 };
    next.gate_by_label[name] = { rule_tree: leafTree({ indicator: "ibs",
      lookback: 0, operator: "<", value: 0.95, value_type: "value",
      value_indicator: "", value_lookback: 0, label: "", connector: "" }) };
  });

  const removeLabel = (idx: number) => setCfgDeep(next => {
    if (next.market_conditions.labels.length <= 1) return; // keep at least one
    const item = next.market_conditions.labels[idx];
    next.market_conditions.labels.splice(idx, 1);
    delete next.ladder_by_label[item.label];
    delete next.gate_by_label[item.label];
  });

  // Patch 142: per-label "has rule" toggle. Off = matches all remaining days.
  const toggleRule = (idx: number, on: boolean) => setCfgDeep(next => {
    next.market_conditions.labels[idx].rule_tree = on
      ? leafTree({ indicator: "close", lookback: 0, operator: "<",
          value: 0, value_type: "indicator_price",
          value_indicator: "sma", value_lookback: 200, label: "", connector: "" })
      : null;
  });

  const setConditionTree = (idx: number, tree: any) => setCfgDeep(next => {
    next.market_conditions.labels[idx].rule_tree = tree;
  });
  const setGateTree = (label: string, tree: any) => setCfgDeep(next => {
    if (!next.gate_by_label[label]) next.gate_by_label[label] = {};
    next.gate_by_label[label].rule_tree = tree;
  });

  const setRule = (idx: number, field: keyof ConditionRule, raw: string) => setCfgDeep(next => {
    const rule = next.market_conditions.labels[idx].rule;
    if (!rule) return;
    (rule as any)[field] = ["indicator", "operator", "value_type", "value_indicator"].includes(field)
      ? raw : Number(raw);
  });

  // Patch 140: per-label GATE rule editing (same leaf shape as conditions)
  const setGateRule = (label: string, field: keyof ConditionRule, raw: string) => setCfgDeep(next => {
    const g = next.gate_by_label[label];
    if (!g || !g.rule) return;
    (g.rule as any)[field] = ["indicator", "operator", "value_type", "value_indicator"].includes(field)
      ? raw : Number(raw);
  });

  // ── member operations (unchanged from 122) ────────────────────────────────
  const addMember = () => {
    if (addId === "" || members.some(m => m.member_strategy_id === addId)) return;
    setMembers([...members, {
      member_strategy_id: addId as number, priority: members.length + 1,
      is_active: true, seed_source_ids: [], overrides: null,
    }]);
    setAddId("");
  };
  const removeMember = (id: number) =>
    setMembers(members.filter(m => m.member_strategy_id !== id)
      .map((m, i) => ({ ...m, priority: i + 1 })));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= members.length) return;
    const next = [...members];
    [next[i], next[j]] = [next[j], next[i]];
    setMembers(next.map((m, k) => ({ ...m, priority: k + 1 })));
  };
  const toggleSeed = (m: CombinedMember, srcId: number) => {
    const has = m.seed_source_ids.includes(srcId);
    const next = has ? m.seed_source_ids.filter(x => x !== srcId)
      : [...m.seed_source_ids, srcId];
    setMembers(members.map(x => x.member_strategy_id === m.member_strategy_id
      ? { ...x, seed_source_ids: next } : x));
  };
  const setOverride = (m: CombinedMember, key: keyof MemberOverrides, raw: string) => {
    const val = raw === "" ? null : Number(raw);
    const ov = { ...(m.overrides ?? {}), [key]: val };
    const empty = Object.values(ov).every(v => v === null || v === undefined);
    setMembers(members.map(x => x.member_strategy_id === m.member_strategy_id
      ? { ...x, overrides: empty ? null : ov } : x));
  };

  const save = async () => {
    setStatus("saving…"); setError("");
    try {
      await saveCombined(combinedId, members, cfg);
      setStatus("saved");
    } catch (e: any) {
      setStatus(""); setError(`Save failed: ${e.response?.data?.detail ?? e.message}`);
    }
  };
  const simulate = async () => {
    setStatus("simulating…"); setError("");
    try {
      const d = await simulateCombined(combinedId);
      setStatus(`done — ${d.trades} trades, ${d.gated_days}/${d.days} days gated`);
    } catch (e: any) {
      setStatus(""); setError(`Simulate failed: ${e.response?.data?.detail ?? e.message}`);
    }
  };
  // Patch 147: evening execution step — production profile. Simulate stays
  // research-profile; this is the button that writes tomorrow's PROPOSED rows.
  const execute = async () => {
    setStatus("executing…"); setError("");
    try {
      const d = await executeCombined(combinedId);
      setStatus(d.gate.open
        ? `executed — ${d.proposed_inserted} proposed + ${d.substitute_pool_inserted} pool `
          + `for ${d.intended_trade_date} @ $${d.production_capital} `
          + `(gate open, ${d.gate.label}, ibs ${d.gate.ibs})`
        : `executed — GATE CLOSED for ${d.intended_trade_date} `
          + `(${d.gate.label}, ibs ${d.gate.ibs}); ${d.deleted} stale row(s) cleared`);
    } catch (e: any) {
      setStatus(""); setError(`Execute failed: ${e.response?.data?.detail ?? e.message}`);
    }
  };

  const num = (label: string, path: string, value: number, step = 1,
               width = "w-24", hint = "") => (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">{label}</span>
      <input type="number" step={step} value={value}
        onChange={e => setC(path, e.target.value)}
        className={`text-sm border rounded-lg px-2 py-1.5 ${width} focus:ring focus:ring-indigo-200`} />
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );

  // Patch 142: summarise a rule TREE as a sentence
  const leafText = (r: any) => {
    const lhs = r.lookback > 0 ? `${r.indicator}(${r.lookback})` : r.indicator;
    const rhs = r.value_type === "indicator_price"
      ? `${r.value_indicator}(${r.value_lookback})` : `${r.value}`;
    return `${lhs} ${r.operator} ${rhs}`;
  };
  const treeText = (n: any): string => {
    if (!n) return "";
    if (n.type === "rule") return leafText(n.rule ?? {});
    const parts = (n.children ?? []).map(treeText).filter(Boolean);
    if (parts.length === 0) return "";
    return parts.length === 1 ? parts[0]
      : "(" + parts.join(` ${(n.logic ?? "AND")} `) + ")";
  };
  const ruleSentence = (tree: any | null) => {
    const t = treeText(tree);
    return t ? `when ${t}` : "matches all remaining days";
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <h2 className="text-lg font-semibold">Combined System #{combinedId}</h2>

      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* ═══ Market conditions (labels + rules) ═══ */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Market conditions</h3>
            <p className="text-xs text-gray-400">
              Define named conditions on the market ticker. Checked in order,
              first match wins; any day matching nothing falls into the LAST
              condition. Each condition gets its own sizing and stand-aside
              threshold below.
            </p>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-gray-600 mb-1">Condition ticker</span>
            <input value={cfg.market_conditions?.ticker ?? "spy"}
              onChange={e => setC("market_conditions.ticker", e.target.value)}
              className="text-sm border rounded-lg px-2 py-1.5 w-24" />
          </label>
        </div>

        {labels.map((l, i) => {
          const p = paletteOf(i);
          const isLast = i === labels.length - 1;
          const hasRule = l.rule_tree !== null && l.rule_tree !== undefined;
          return (
            <div key={i} className={`rounded-xl p-3 border ${p.bg} ${p.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{p.icon}</span>
                <input
                  value={draftNames[i] ?? l.label}
                  onChange={e => setDraftNames({ ...draftNames, [i]: e.target.value })}
                  onBlur={() => {
                    const draft = (draftNames[i] ?? l.label).trim();
                    renameLabel(i, draft);                    // validates; no-op if invalid
                    setDraftNames(d => { const n = { ...d }; delete n[i]; return n; });
                  }}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className={`text-sm font-semibold bg-transparent border-b border-dashed
                    border-gray-300 focus:outline-none w-32 ${p.text}`} />
                <span className="text-xs text-gray-400 flex-1">{ruleSentence(l.rule_tree)}</span>
                <label className="flex items-center gap-1 text-[11px] text-gray-500 bg-white/70 rounded px-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={hasRule}
                    onChange={e => toggleRule(i, e.target.checked)} />
                  has rule
                </label>
                {labels.length > 1 &&
                  <button onClick={() => removeLabel(i)}
                    className="text-xs px-2 py-1 border rounded text-red-500 bg-white">remove</button>}
              </div>
              {hasRule && (
                <div className="bg-white rounded-lg border border-gray-200 p-3 w-full">
                  <RulesTreeEditor
                    label=""
                    tree={l.rule_tree ?? emptyTree()}
                    onChange={(t: any) => setConditionTree(i, t)}
                    showPreview={false}
                    indicators={conditionIndicators}
                    marketIndicators={conditionIndicators}
                    tickerOptions={INDEX_TICKERS}
                  />
                </div>
              )}
              {!hasRule &&
                <div className="text-[11px] text-gray-400 ml-8">
                  No rule — matches every day not claimed by a condition above.
                </div>}
              {isLast &&
                <div className="text-[11px] text-gray-400 ml-8 mt-1">
                  Last condition: any day matching no rule at all (e.g.
                  indicator warm-up) also lands here.
                </div>}
            </div>
          );
        })}
        <button onClick={addLabel}
          className="text-xs px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded-lg">
          + Add condition</button>
      </div>

      {/* ═══ Members ═══ */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Subsystems (processing order)</h3>
            <p className="text-xs text-gray-400">
              Each subsystem contributes its daily trade candidates. They are
              processed top-to-bottom; earlier systems claim capital first.
            </p>
          </div>
          <div className="flex gap-2">
            <select value={addId} onChange={e => setAddId(Number(e.target.value))}
              className="text-sm border rounded-lg px-2 py-1.5">
              <option value="">Add subsystem…</option>
              {allStrategies
                .filter(s => s.id !== combinedId &&
                             !members.some(m => m.member_strategy_id === s.id))
                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={addMember}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">Add</button>
          </div>
        </div>

        {members.length === 0 && (
          <p className="text-xs text-gray-400 italic">
            No subsystems yet — add the strategies this book should combine.
          </p>
        )}

        {members.map((m, i) => (
          <div key={m.member_strategy_id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-indigo-100 text-indigo-700 rounded px-2 py-0.5">
                #{m.priority}</span>
              <span className="text-sm font-medium flex-1">
                {m.strategy_name ?? nameOf(m.member_strategy_id)}</span>
              <button onClick={() => move(i, -1)} className="text-xs px-2 py-1 border rounded">↑</button>
              <button onClick={() => move(i, 1)} className="text-xs px-2 py-1 border rounded">↓</button>
              <button onClick={() => removeMember(m.member_strategy_id)}
                className="text-xs px-2 py-1 border rounded text-red-600">Remove</button>
            </div>

            <div className="flex flex-wrap gap-6 items-end">
              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1">
                  Count duplicate tickers from</span>
                <div className="flex gap-3">
                  {members.filter(x => x.member_strategy_id !== m.member_strategy_id).map(x => (
                    <label key={x.member_strategy_id} className="flex items-center gap-1 text-xs">
                      <input type="checkbox"
                        checked={m.seed_source_ids.includes(x.member_strategy_id)}
                        onChange={() => toggleSeed(m, x.member_strategy_id)} />
                      {x.strategy_name ?? nameOf(x.member_strategy_id)}
                    </label>
                  ))}
                  {members.length === 1 &&
                    <span className="text-xs text-gray-400">no other members</span>}
                </div>
                <span className="block text-[11px] text-gray-400 mt-0.5">
                  If a checked system also picked the same ticker today, this
                  system's position in it is sized smaller (see multipliers).
                </span>
              </div>

              <div className="flex gap-3">
                {(["curr_hold_1", "seed_1", "seed_other"] as (keyof MemberOverrides)[]).map(k => (
                  <label key={k} className="block">
                    <span className="block text-xs text-gray-500 mb-1">override {k}</span>
                    <input type="number" step={0.1} min={0.1} placeholder="—"
                      value={m.overrides?.[k] ?? ""}
                      onChange={e => setOverride(m, k, e.target.value)}
                      className="text-sm border rounded-lg px-2 py-1 w-20" />
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Allocation ═══ */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium">Capital allocation</h3>
        <div className="flex flex-wrap gap-4">
          {num("Capital", "capital", cfg.capital, 100, "w-24", "book total $")}
          {num("Base slots", "base_slots", cfg.base_slots)}
          {num("Slot divisor", "slot_divisor", cfg.slot_divisor)}
          {num("Max slots", "max_slots", cfg.max_slots, 1, "w-24", "positions/day cap")}
          {num("Max per ticker", "max_per_ticker", cfg.max_per_ticker)}
          {num("Min to enter", "min_to_enter", cfg.min_to_enter, 1, "w-24", "skip if qty ≤ this")}
        </div>
        {/* Patch 146: production (live execution) profile — consumed only by
            the execution path. Simulate always runs the research values
            above, keeping parity runs comparable to the legacy reference
            (legacy: research $100k / min 5 · production M-book $25k / min 2). */}
        <div className="rounded-xl p-4 border bg-indigo-50/40 border-indigo-200">
          <div className="text-sm font-semibold text-indigo-800 mb-1">
            Production (live execution)</div>
          <p className="text-[11px] text-gray-500 mb-3">
            Used only when this book trades live. Simulate keeps using the
            research values above, so backtests stay comparable to legacy.
          </p>
          <div className="flex flex-wrap gap-4">
            {num("Production capital", "production_capital",
              cfg.production_capital ?? 25000, 100, "w-28", "live book $")}
            {num("Production min to enter", "production_min_to_enter",
              cfg.production_min_to_enter ?? 2, 1, "w-28", "skip if qty ≤ this")}
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Position size = (Capital ÷ Base slots ÷ Slot divisor) × multiplier.
          These apply in ANY market condition:
        </p>
        <div className="flex flex-wrap gap-4">
          {num("1st time ×", "ladder.base", cfg.ladder.base, 0.1)}
          {num("seen once elsewhere ×", "ladder.seed_count.1", cfg.ladder.seed_count["1"], 0.1, "w-32")}
          {num("seen twice elsewhere ×", "ladder.seed_count.2", cfg.ladder.seed_count["2"], 0.1, "w-32")}
        </div>
        <p className="text-xs text-gray-400">
          The 2nd and 3rd buy of the SAME stock, per market condition:
        </p>
        <div className="grid grid-cols-2 gap-3">
          {labels.map((l, i) => {
            const p = paletteOf(i);
            return (
              <div key={l.label} className={`rounded-xl p-4 border ${p.bg} ${p.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{p.icon}</span>
                  <span className={`text-sm font-semibold ${p.text}`}>{l.label}</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">{ruleSentence(l.rule_tree)}</p>
                <div className="flex gap-4">
                  {num("2nd buy ×", `ladder_by_label.${l.label}.second_buy`,
                    cfg.ladder_by_label?.[l.label]?.second_buy ?? 1.0, 0.1)}
                  {num("3rd buy ×", `ladder_by_label.${l.label}.third_buy`,
                    cfg.ladder_by_label?.[l.label]?.third_buy ?? 1.0, 0.1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Gate ═══ */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Market gate (IBS)</h3>
            <p className="text-xs text-gray-400">
              Checked once per day on yesterday's bar of the condition ticker.
              If it closed too near its daily high (IBS at or above the
              threshold for the active condition), no trades are taken that day.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={cfg.gate.enabled}
              onChange={e => setC("gate.enabled", e.target.checked)} /> Enabled
          </label>
        </div>
        <div className="space-y-3">
          {labels.map((l, i) => {
            const p = paletteOf(i);
            return (
              <div key={l.label} className={`rounded-xl p-4 border ${p.bg} ${p.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{p.icon}</span>
                  <span className={`text-sm font-semibold ${p.text}`}>{l.label}</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">{ruleSentence(l.rule_tree)}</p>
                <div className="text-xs text-gray-600 mb-1">Trade only when:</div>
                <div className="bg-white rounded-lg border border-gray-200 p-3 w-full">
                  <RulesTreeEditor
                    label=""
                    tree={cfg.gate_by_label?.[l.label]?.rule_tree ?? emptyTree()}
                    onChange={(t: any) => setGateTree(l.label, t)}
                    showPreview={false}
                    indicators={gateIndicatorsLhs}
                    marketIndicators={gateIndicatorsRhs}
                  />
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  e.g. ibs &lt; 0.95 (legacy) · ibs &lt; 1.1 = never stand aside</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <button onClick={save}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save</button>
        <button onClick={simulate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Simulate</button>
        {/* Patch 147: writes tomorrow's PROPOSED rows at the production profile */}
        <button onClick={execute}
          className="px-4 py-2 border border-indigo-600 text-indigo-700 rounded-lg text-sm">
          Execute (production)</button>
        <span className="text-sm text-gray-500">{status}</span>
      </div>
    </div>
  );
}