import React, { useEffect, useMemo } from "react";
import type { Rule, RuleTree, RuleNode, Logic } from "../model/MarketRegime";

import {
  OPERATORS,
  COMPARISON_TYPES,
  UNIVERSES,
} from "../constants/options.ts";
import { useIndicatorRegistry } from "../context/IndicatorRegistry.tsx";

// ---------- helpers ----------
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const emptyRule = (): Rule => ({
  label: "",
  indicator: "",
  lookback: 0,
  operator: "",
  value: 0,
  connector: "", // legacy only
  value_type: "indicator_price",
  value_indicator: "",
  value_lookback: 0,
});

const emptyRuleNode = (): RuleNode => ({ type: "rule", id: uid(), rule: emptyRule() });

const emptyRootTree = (): RuleTree => ({
  type: "group",
  id: "root",
  logic: "AND",
  children: [], // ✅ root always has at least 1 rule
});

// immutable replace node by id
function updateNode(root: RuleNode, id: string, updater: (n: RuleNode) => RuleNode): RuleNode {
  if (root.id === id) return updater(root);
  if (root.type === "group") {
    return { ...root, children: root.children.map((c) => updateNode(c, id, updater)) };
  }
  return root;
}

// immutable delete by id (caller must prevent deleting root)
function deleteNode(root: RuleNode, id: string): RuleNode {
  if (root.type !== "group") return root;
  return {
    ...root,
    children: root.children
      .filter((c) => c.id !== id)
      .map((c) => (c.type === "group" ? deleteNode(c, id) : c)),
  };
}



// ---------- preview expression (optional / legacy style) ----------
function ruleToExpr(r: Rule): string {
  if (!r.indicator) return "";

  // month_in: calendar rule — show "month in [5, 6]"
  if (r.operator === "month_in") {
    const months = r.label && r.label.trim() !== "" ? r.label : String(r.value);
    return `month in [${months}]`;
  }

  // ruleToExpr is used only for the legacy expression preview string (not the pill display)
  // It doesn't have access to the registry hook, so we use a simple boolean check
  const isBoolean = r.value_type === "value" && r.operator === "IS_TRUE";

  // ✅ N-week occurrence / boolean indicators use params
  if (isBoolean) {
    const p = r.params || {};
    // adjust keys to whatever you used in INDICATOR_META params
    const windowDays = p.n_week_days ?? 252;
    const occurredWithinDays = p.within_days ?? 20;

    return `${r.indicator}(${windowDays}, ${occurredWithinDays})`;
  }

  // existing logic for normal indicators
  if (!r.operator && r.value_type !== "top_n" && r.value_type !== "top_n_universe") return "";
  const left = `${r.indicator}_${r.lookback ?? 0}`;

  const vt = r.value_type || (r.value > 0 ? "value" : "indicator_price");

  if (vt === "top_n") return `${left} TOP ${Number(r.value)} (${r.ranking_order === "Ascending" ? "lowest" : "highest"})`;
  if (vt === "top_n_universe") return `${left} TOP ${Number(r.value)} in universe (${r.ranking_order === "Ascending" ? "lowest" : "highest"})`;
  if (vt === "value") return `${left} ${r.operator} ${Number(r.value)}`;

  const right = r.value_indicator ? `${r.value_indicator}_${r.value_lookback ?? 0}` : "???";
  return `${left} ${r.operator} ${right}`;
}


export function nodeToExpr(node: RuleNode): string {
  console.log("nodeToExpr", node);
  if (node.type === "rule") return ruleToExpr(node.rule);

  const parts = node.children.map(nodeToExpr).filter((s) => s.trim().length > 0);
  if (!parts.length) return "";

  const joiner = node.logic === "AND" ? " && " : " || ";
  const inner = parts.join(joiner);

  const needsParens = node.children.length > 1 || node.children.some((c) => c.type === "group");
  return needsParens ? `(${inner})` : inner;
}

// ---------- main component ----------
type Props = {
  label?: string;
  tree?: RuleTree; // allow undefined so we can bootstrap
  onChange: (tree: RuleTree) => void;
  showPreview?: boolean;
  /** Override entry/exit indicator list (defaults to global INDICATORS) */
  indicators?: Record<string, string>;
  /** Override market trend / value indicator list (defaults to global MARKET_INDICATORS) */
  marketIndicators?: Record<string, string>;
  /** When provided, shows a ticker dropdown per rule (for market trend rules) */
  tickerOptions?: Record<string, string>;
};

const RulesTreeEditor: React.FC<Props> = ({ label, tree, onChange, showPreview = true, indicators, marketIndicators, tickerOptions }) => {

  // Indicator lists come from props (populated by caller via useIndicatorRegistry)
  const _indicators = indicators ?? {};
  const _marketIndicators = marketIndicators ?? {};
  // bootstrap: if undefined, create a default root
//   useEffect(() => {
//     if (!tree) onChange(emptyRootTree());
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [tree]);



  const expr = useMemo(() => (tree ? nodeToExpr(tree) : ""), [tree]);

  if (!tree) return null;

  return (
    <div className="space-y-3">
      {label && <h4 className="text-lg font-bold text-green-800">{label}</h4>}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        {/* Root header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-3">
            <div className="font-semibold">Root Group</div>

            <div className="inline-flex rounded-md overflow-hidden border border-gray-300">
              <button
                type="button"
                className={`px-3 py-1 text-sm ${tree.logic === "AND" ? "bg-indigo-600 text-white" : "bg-white"}`}
                onClick={() => onChange({ ...tree, logic: "AND" })}
              >
                AND
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-sm ${tree.logic === "OR" ? "bg-indigo-600 text-white" : "bg-white"}`}
                onClick={() => onChange({ ...tree, logic: "OR" })}
              >
                OR
              </button>
            </div>

            <div className="text-xs text-gray-600">
              Match: <b>{tree.logic === "AND" ? "ALL" : "ANY"}</b>
            </div>
          </div>

          {/* Root actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm"
              onClick={() => onChange({ ...tree, children: [...tree.children, emptyRuleNode()] })}
            >
              ➕ Add rule
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm"
              onClick={() =>
                onChange({
                  ...tree,
                  children: [...tree.children, { type: "group", id: uid(), logic: "AND", children: [emptyRuleNode()] }],
                })
              }
            >
              ➕ Add group
            </button>

            {/* ✅ Root delete is not allowed */}
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-500 text-sm cursor-not-allowed"
              disabled
              title="Root group cannot be deleted"
            >
              ✖ Delete root
            </button>
          </div>
        </div>

        {/* children */}
        {tree.children.length === 0 ? (
        <div className="rounded-lg border border-dashed border-amber-300 bg-white p-4 text-sm text-amber-900">
            No rules yet. Click <b>“Add rule”</b> or <b>“Add group”</b> to start building.
        </div>
        ) : (
        <div className="space-y-4">
            {tree.children.map((child) => (
            <NodeEditor
                key={child.id}
                node={child}
                depth={0}
                onChangeNode={(id, updater) => onChange(updateNode(tree, id, updater) as RuleTree)}
                onDeleteNode={(id) => onChange(deleteNode(tree, id) as RuleTree)}
                _indicators={_indicators}
                _marketIndicators={_marketIndicators}
                tickerOptions={tickerOptions}
            />
            ))}
        </div>
        )}

        {/* preview */}
        {showPreview && (
          <div className="mt-4 bg-slate-900 text-slate-100 rounded-lg p-3 text-sm">
            <div className="text-slate-300 text-xs mb-1">Expression Preview</div>
            <div className="break-words">{expr || "(empty)"}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Template E: Pill Tree display ────────────────────────────────────────────

// ── S2 Rule Display ───────────────────────────────────────────────────────────
// Dark background. Each rule: dot · LHS  OP  RHS on one line.
// Dot colour = green (AND) or amber (OR).
// Operator colour = amber — pops clearly between green LHS and blue RHS.
// Rank rules use ↓ operator + purple value.
// Nested groups indent under a matching coloured left border.

type RuleItem = {
  indicator: string;    // LHS — what is being measured
  op:        string;    // operator — > < ≥ ≤ = ↓
  value:     string;    // RHS — threshold or compared-to indicator
  valueKind: "rhs" | "rank" | "boolean";  // controls RHS colour
};

function buildRuleItem(
  r: Rule,
  labelFn?: (k: string, lb?: number) => string,
  regMeta?: Record<string, any>
): RuleItem | null {
  if (!r.indicator) return null;

  const meta      = regMeta?.[r.indicator];
  const isBoolean = meta?.kind === "boolean";
  const vt        = r.value_type || (r.value > 0 ? "value" : "indicator_price");
  const hasLB     = meta?.has_lookback ?? true;

  // Base indicator label e.g. "Close price" or "SMA(175)"
  const indBase = labelFn
    ? labelFn(r.indicator, hasLB ? r.lookback : undefined)
    : r.indicator;

  // If rule has a ticker context (market trend rules: SPY, VIX, GLD),
  // append it so the user knows exactly which instrument is being measured.
  // e.g. "Close price" → "Close price (SPY)"
  const ticker = r.regime_ticker ? r.regime_ticker.toUpperCase() : null;
  const ind    = ticker ? `${indBase} (${ticker})` : indBase;

  const SYM: Record<string, string> = {
    ">": ">", "<": "<", ">=": "≥", "<=": "≤", "==": "=",
    month_in: "in months",
  };

  // month_in operator — special pill: "Month of year  in months  5, 6"
  if (r.operator === "month_in") {
    const months = r.label && r.label.trim() !== ""
      ? r.label
      : String(r.value);
    return { indicator: "Month", op: "in", value: months, valueKind: "rhs" };
  }

  if (isBoolean) {
    return { indicator: ind, op: "is", value: "true", valueKind: "boolean" };
  }
  if (vt === "top_n" || vt === "top_n_universe") {
    const dir    = r.ranking_order === "Ascending" ? "bottom" : "top";
    const suffix = vt === "top_n_universe" ? " of universe" : "";
    return { indicator: ind, op: "↓", value: `${dir} ${Number(r.value)}${suffix}`, valueKind: "rank" };
  }
  if (vt === "value") {
    return { indicator: ind, op: SYM[r.operator] ?? r.operator, value: String(Number(r.value)), valueKind: "rhs" };
  }
  if (vt === "indicator_price") {
    const vMeta   = regMeta?.[r.value_indicator ?? ""];
    const hasVLB  = vMeta?.has_lookback ?? true;
    // Base RHS label e.g. "SMA(175)"
    const valBase = labelFn
      ? labelFn(r.value_indicator ?? "", hasVLB ? r.value_lookback : undefined)
      : (r.value_indicator ?? "");
    // Apply same ticker context to the RHS — both sides of a market trend
    // rule refer to the same instrument.
    // e.g. "SMA(175)" → "SMA(175) (SPY)"
    const val = ticker ? `${valBase} (${ticker})` : valBase;
    return { indicator: ind, op: SYM[r.operator] ?? r.operator, value: val, valueKind: "rhs" };
  }
  return null;
}

// One rule row: dot · LHS  OP  RHS
function S2RuleRow({
  item,
  isAnd,
}: {
  item: RuleItem;
  isAnd: boolean;
}) {
  const dotColor  = isAnd ? "#5DCAA5" : "#EF9F27";
  const rhsColor  = item.valueKind === "rank"
    ? "#AFA9EC"
    : item.valueKind === "boolean"
    ? "#5DCAA5"
    : "#85B7EB";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1 }}>
      {/* coloured dot */}
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
      {/* LHS — green */}
      <span style={{ color: "#9FE1CB", fontWeight: 500 }}>{item.indicator}</span>
      {/* operator — amber, pops between LHS and RHS */}
      <span style={{ color: "#EF9F27", fontWeight: 600, fontSize: 13, margin: "0 1px" }}>{item.op}</span>
      {/* RHS — blue / purple / green depending on kind */}
      <span style={{ color: rhsColor, fontWeight: 500 }}>{item.value}</span>
    </div>
  );
}

// Recursive node renderer
function S2Node({
  node,
  isRootAnd = true,
  labelFn,
  regMeta,
}: {
  node: RuleNode;
  isRootAnd?: boolean;
  labelFn?: (k: string, lb?: number) => string;
  regMeta?: Record<string, any>;
}) {
  if (node.type === "rule") {
    const item = buildRuleItem(node.rule, labelFn, regMeta);
    if (!item) return null;
    return <S2RuleRow item={item} isAnd={isRootAnd} />;
  }

  const isAnd       = node.logic === "AND";
  const borderColor = isAnd ? "#5DCAA550" : "#EF9F2750";
  const borderStyle = isAnd ? "solid" : "dashed";
  const labelColor  = isAnd ? "#5DCAA5" : "#EF9F27";
  const labelText   = isAnd ? "all must pass" : "any one passes";

  return (
    <div>
      {/* tiny logic label */}
      <div style={{ fontSize: 9, fontWeight: 500, color: labelColor, letterSpacing: ".08em", paddingBottom: 3, paddingLeft: 2 }}>
        {labelText}
      </div>
      {/* children with coloured left border */}
      <div style={{
        paddingLeft: 10,
        borderLeft: `1.5px ${borderStyle} ${borderColor}`,
        marginLeft: 2,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}>
        {node.children.map((child) => (
          <S2Node
            key={child.id}
            node={child}
            isRootAnd={isAnd}
            labelFn={labelFn}
            regMeta={regMeta}
          />
        ))}
      </div>
    </div>
  );
}

// UNIVERSES imported from options.ts — no local copy needed

/**
 * RulePillsDisplay — S2 style.
 * Dark panel. Each rule on one line: dot · LHS  OP  RHS
 * Operator in amber so it pops between green LHS and blue RHS.
 * AND = green dot + solid border. OR = amber dot + dashed border.
 *
 * Props:
 *   tree     — the rule tree to display
 *   universe — optional universe key (e.g. "liquid500", "sp500").
 *              When provided, shows a context header so a non-engineer
 *              knows which stocks the rules are applied to.
 *              Pass for entry/exit rules. Omit for market trend rules
 *              (those already show the ticker on each rule line).
 */
export const RulePillsDisplay: React.FC<{
  tree?: RuleTree;
  universe?: string;
}> = ({ tree, universe }) => {
  const { labelFor, registry } = useIndicatorRegistry();
  if (!tree || tree.children.length === 0) return null;

  // Resolve universe label — handle comma-separated ETF lists e.g. "SPY,GLD"
  const universeLabel = (() => {
    if (!universe) return null;
    const trimmed = universe.trim();
    if (!trimmed) return null;
    // Named universe key (sp500, liquid500, russell3000)
    if (UNIVERSES[trimmed]) return UNIVERSES[trimmed];
    // Individual ETF list — show tickers directly e.g. "SPY, GLD"
    const tickers = trimmed.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length > 0) return tickers.join(", ");
    return null;
  })();

  return (
    <div style={{ background: "#1e2228", borderRadius: 6, padding: "7px 10px" }}>
      {/* Context header — tells non-engineers which stocks these rules apply to */}
      {universeLabel && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 6,
          paddingBottom: 5,
          borderBottom: "0.5px solid #ffffff10",
        }}>
          <span style={{ fontSize: 9, color: "#5F5E5A", letterSpacing: ".06em", textTransform: "uppercase" }}>
            applies to each stock in
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 500,
            color: "#9FE1CB",
            background: "#0F3D2C",
            padding: "1px 7px",
            borderRadius: 4,
            border: "0.5px solid #5DCAA530",
            fontFamily: "var(--font-mono)",
          }}>
            {universeLabel}
          </span>
        </div>
      )}
      <S2Node node={tree} isRootAnd={tree.logic === "AND"} labelFn={labelFor} regMeta={registry} />
    </div>
  );
};


export default RulesTreeEditor;

// ---------- sub components ----------
function NodeEditor({
  node,
  depth,
  onChangeNode,
  onDeleteNode,
  _indicators,
  _marketIndicators,
  tickerOptions,
}: {
  node: RuleNode;
  depth: number;
  onChangeNode: (id: string, updater: (n: RuleNode) => RuleNode) => void;
  onDeleteNode: (id: string) => void;
  _indicators: Record<string, string>;
  _marketIndicators: Record<string, string>;
  tickerOptions?: Record<string, string>;
}) {
  if (node.type === "rule") {
    return (
      <RuleRow
        rule={node.rule}
        onChange={(r) => onChangeNode(node.id, () => ({ type: "rule", id: node.id, rule: r }))}
        onRemove={() => onDeleteNode(node.id)}
        _indicators={_indicators}
        _marketIndicators={_marketIndicators}
        tickerOptions={tickerOptions}
      />
      
    );
  }

  return (
    <div className={`border border-gray-200 rounded-xl bg-white p-3 ${depth > 0 ? "ml-4" : ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-3">
          <div className="font-semibold">{depth === 0 ? "Group" : "Subgroup"}</div>

          <div className="inline-flex rounded-md overflow-hidden border border-gray-300">
            <button
              type="button"
              className={`px-3 py-1 text-sm ${node.logic === "AND" ? "bg-indigo-600 text-white" : "bg-white"}`}
              onClick={() => onChangeNode(node.id, (n) => ({ ...(n as any), logic: "AND" }))}
            >
              AND
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-sm ${node.logic === "OR" ? "bg-indigo-600 text-white" : "bg-white"}`}
              onClick={() => onChangeNode(node.id, (n) => ({ ...(n as any), logic: "OR" }))}
            >
              OR
            </button>
          </div>

          <div className="text-xs text-gray-600">
            Match: <b>{node.logic === "AND" ? "ALL" : "ANY"}</b>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm"
            onClick={() =>
              onChangeNode(node.id, (n) => ({
                ...(n as any),
                children: [...(n as any).children, emptyRuleNode()],
              }))
            }
          >
            ➕ Add rule
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm"
            onClick={() =>
              onChangeNode(node.id, (n) => ({
                ...(n as any),
                children: [...(n as any).children, { type: "group", id: uid(), logic: "AND", children: [emptyRuleNode()] }],
              }))
            }
          >
            ➕ Add group
          </button>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm"
            onClick={() => onDeleteNode(node.id)}
          >
            ✖ Delete
          </button>
        </div>
      </div>

<div className="space-y-3">
  {(node.children || []).length === 0 ? (
    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
      This group is empty. Click <b>Add rule</b> or <b>Add group</b>.
    </div>
  ) : (
    (node.children || []).map((child) => (
      <NodeEditor
        key={child.id}
        node={child}
        depth={depth + 1}
        onChangeNode={onChangeNode}
        onDeleteNode={onDeleteNode}
        _indicators={_indicators}
        _marketIndicators={_marketIndicators}
        tickerOptions={tickerOptions}
      />
    ))
  )}
</div>

    </div>
  );
}

function RuleRow({
  rule,
  onChange,
  onRemove,
  _indicators,
  _marketIndicators,
  tickerOptions,
}: {
  rule: Rule;
  onChange: (r: Rule) => void;
  onRemove: () => void;
  _indicators: Record<string, string>;
  _marketIndicators: Record<string, string>;
  tickerOptions?: Record<string, string>;
}) {
  const { registry } = useIndicatorRegistry();
  const getMeta = (key: string) => {
    const r = registry[key];
    if (!r) return null;
    return {
      hasLookback:     r.has_lookback,
      kind:            r.kind ?? null,
      hasRange:        r.has_range ?? false,
      params:          r.params ?? [],
      defaultLookback: r.default_lookback,
    };
  };

  const valueType = rule.value_type || (rule.value > 0 ? "value" : "indicator_price");

  const meta = getMeta(rule.indicator);
  const isBoolean = meta?.kind === "boolean";
  // month_in: calendar-based operator — no RHS indicator/value fields needed
  const isMonthIn = rule.operator === "month_in";
  const params = rule.params || {};

  return (
    <>
    {isMonthIn ? (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Indicator</label>
        <select
          value={rule.indicator}
          onChange={(e) => {
            const selected = e.target.value;
            const nextMeta = getMeta(selected);
            const nextIsBoolean = nextMeta?.kind === "boolean";
            const nextParams: Record<string, any> = {};
            (nextMeta?.params || []).forEach((p: any) => { nextParams[p.key] = p.default ?? ""; });
            onChange({
              ...rule,
              indicator: selected,
              lookback: nextMeta?.defaultLookback ?? 0, // Patch 100: crsi hardcode removed — registry default (2) applies
              operator: selected === "month" ? "month_in" : nextIsBoolean ? "IS_TRUE" : rule.operator === "month_in" ? "" : rule.operator,
              value_type: (selected === "month" || nextIsBoolean) ? "value" : rule.value_type,
              value: nextIsBoolean ? 1 : rule.value,
              label: selected === "month" ? (rule.label || "") : (rule.operator === "month_in" ? "" : rule.label),
              value_indicator: (selected === "month" || nextIsBoolean) ? "" : rule.value_indicator,
              value_lookback: (selected === "month" || nextIsBoolean) ? 0 : rule.value_lookback,
              params: (nextMeta?.params?.length ? nextParams : undefined),
            });
          }}
          className="border px-2 py-1 rounded text-xs focus:ring focus:ring-indigo-200"
        >
          <option value="">-- Select --</option>
          {Object.entries(_indicators).map(([key, lbl]) => (
            <option key={key} value={key}>{lbl as string}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Operator</label>
        <select value={rule.operator} onChange={(e) => onChange({ ...rule, operator: e.target.value })}
          className="border px-2 py-1 rounded text-xs focus:ring focus:ring-indigo-200">
          <option value="month_in">month in</option>
        </select>
      </div>
      <div className="flex items-center gap-2 flex-1">
        <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Months</label>
        <input type="text" value={rule.label || ""} placeholder="5,6  (May=5, Jun=6)"
          onChange={(e) => onChange({ ...rule, label: e.target.value })}
          className="border border-yellow-400 bg-yellow-50 px-2 py-1 rounded text-xs focus:ring focus:ring-yellow-300 w-44" />
        <span className="text-xs text-gray-400 whitespace-nowrap">1=Jan … 12=Dec</span>
      </div>
      <button type="button" onClick={onRemove} className="text-red-500 text-xs hover:underline ml-auto">Remove</button>
    </div>
    ) : (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-4 grid grid-cols-1 ${tickerOptions ? "sm:grid-cols-8" : "sm:grid-cols-6"} gap-4 items-end`}>
      {/* Regime Label — only for market trend rules (becomes the regime's unique key in backend).
          Hidden for month_in because calendar rules don't need a label. */}
      {tickerOptions && !isMonthIn && (
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Label <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={rule.label || ""}
          placeholder="bull / bear"
          title='Unique per regime (e.g. "bull", "bear", "vol", "non_vol"). Required — empty labels cause regime collisions.'
          onChange={(e) => onChange({ ...rule, label: e.target.value })}
          className={`w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200 ${
            !rule.label ? "border-red-400 bg-red-50" : "border-gray-300"
          }`}
        />
      </div>
      )}
      {/* Ticker — only for market trend / volatility rules; hidden for month_in (calendar-only) */}
      {tickerOptions && !isMonthIn && (
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Ticker</label>
        <select
          value={rule.regime_ticker || ""}
          onChange={(e) => onChange({ ...rule, regime_ticker: e.target.value })}
          className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
        >
          <option value="">-- Ticker --</option>
          {Object.entries(tickerOptions).map(([key, lbl]) => (
            <option key={key} value={lbl}>{lbl}</option>
          ))}
        </select>
      </div>
      )}
      {/* Indicator */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Indicator</label>
        <select
          value={rule.indicator}
            onChange={(e) => {
            const selected = e.target.value;
            const nextMeta = getMeta(selected);
            const nextIsBoolean = nextMeta?.kind === "boolean";

            // build default params if defined in meta
            const nextParams: Record<string, any> = {};
            (nextMeta?.params || []).forEach((p: any) => {
                nextParams[p.key] = p.default ?? "";
            });

            const next: Rule = {
              ...rule,
              indicator: selected,

              lookback: nextMeta?.defaultLookback ?? 0, // Patch 100: crsi hardcode removed — registry default (2) applies

              // Auto-set operator and clear stale fields for month indicator
              operator: selected === "month" ? "month_in"
                      : nextIsBoolean ? "IS_TRUE"
                      : rule.operator === "month_in" ? "" // clear month_in if switching away
                      : rule.operator,
              value_type: (selected === "month" || nextIsBoolean) ? "value" : rule.value_type,
              value: nextIsBoolean ? 1 : rule.value,
              // Clear label when switching away from month
              label: selected === "month" ? (rule.label || "") : (rule.operator === "month_in" ? "" : rule.label),

              // ✅ CLEAR stale compare fields so "unadjusted_close" doesn't leak in
              value_indicator: (selected === "month" || nextIsBoolean) ? "" : rule.value_indicator,
              value_lookback: (selected === "month" || nextIsBoolean) ? 0 : rule.value_lookback,

              // optional: if you have label/connector etc you can keep them
              params: (nextMeta?.params?.length ? nextParams : undefined),
            };


            onChange(next);
            }}

          className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
        >
          <option value="">-- Select --</option>
          {Object.entries(_indicators).map(([key, lbl]) => (
            <option key={key} value={key}>
              {lbl}
            </option>
          ))}
        </select>
      </div>

      {/* Lookback */}
      {!isMonthIn && (getMeta(rule.indicator)?.hasLookback ?? true) && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Lookback</label>
          <input
            type="number"
            value={rule.lookback}
            onChange={(e) => onChange({ ...rule, lookback: +e.target.value })}
            className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
          />
        </div>
      )}
            {/* Params (dynamic, for special indicators) */}
      {meta?.params?.length ? (
        <div className="sm:col-span-3 flex flex-wrap sm:flex-nowrap gap-4">

          {meta.params.map((p: any) => (
            <div key={p.key} className="min-w-[160px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {p.label}
              </label>
              <input
                type={p.type === "number" ? "number" : "text"}
                min={p.min}
                value={params[p.key] ?? p.default ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const v = p.type === "number" ? (raw === "" ? "" : +raw) : raw;

                  onChange({
                    ...rule,
                    params: { ...params, [p.key]: v },
                  });
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
              />
            </div>
          ))}
        </div>
      ) : null}


      {/* Operator */}
      {/* <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Operator</label>
        <select
          value={rule.operator}
          onChange={(e) => onChange({ ...rule, operator: e.target.value })}
          className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
        >
          <option value="">Op</option>
          {Object.entries(OPERATORS).map(([key, lbl]) => (
            <option key={key} value={key}>
              {lbl}
            </option>
          ))}
        </select>
      </div> */}

      {/* Value Type */}
      {/* <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Value Type</label>
        <select
          value={valueType}
          onChange={(e) => onChange({ ...rule, value_type: e.target.value })}
          className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
        >
          <option value="">-- Select --</option>
          {Object.entries(COMPARISON_TYPES).map(([key, lbl]) => (
            <option key={key} value={key}>
              {lbl}
            </option>
          ))}
        </select>
      </div> */}

      {/* Value */}
      {/* {valueType === "value" && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Value</label>
          <input
            type="number"
            value={rule.value}
            onChange={(e) => onChange({ ...rule, value: +e.target.value })}
            className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
          />
        </div>
      )} */}

      {/* Compare To */}
      {/* {valueType === "indicator_price" && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Compare To</label>
          <select
            value={rule.value_indicator}
            onChange={(e) => onChange({ ...rule, value_indicator: e.target.value })}
            className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
          >
            <option value="">-- Select --</option>
            {Object.entries(_marketIndicators).map(([key, lbl]) => (
              <option key={key} value={key}>
                {lbl}
              </option>
            ))}
          </select>
        </div>
      )} */}

      {/* Compare To Lookback */}
      {/* {valueType === "indicator_price" && (INDICATOR_META[rule.value_indicator]?.hasLookback ?? true) && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Lookback</label>
          <input
            type="number"
            value={rule.value_lookback}
            onChange={(e) => onChange({ ...rule, value_lookback: +e.target.value })}
            className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
          />
        </div>
      )} */}
        {!isBoolean ? (
        <>
            {/* Operator — hidden for top_n and top_n_universe */}
            {valueType !== "top_n" && valueType !== "top_n_universe" && (
            <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Operator</label>
            <select
                value={rule.operator}
                onChange={(e) => onChange({ ...rule, operator: e.target.value })}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
            >
                <option value="">Op</option>
                {Object.entries(OPERATORS).map(([key, lbl]) => (
                <option key={key} value={key}>
                    {lbl}
                </option>
                ))}
            </select>
            </div>
            )}

            {/* month_in: show Months list field instead of normal RHS */}
            {isMonthIn ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Months <span className="text-gray-400 font-normal">(comma-separated, e.g. 5,6 = May, Jun)</span>
              </label>
              <input
                type="text"
                value={rule.label || ""}
                placeholder="5,6"
                onChange={(e) => onChange({ ...rule, label: e.target.value })}
                className="w-full border border-yellow-400 px-2 py-1 rounded focus:ring focus:ring-yellow-300 bg-yellow-50"
              />
            </div>
            ) : (
            <>
            {/* Value Type */}
            <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Value Type</label>
            <select
                value={valueType}
                onChange={(e) => {
                  const newType = e.target.value;
                  const updates: Partial<Rule> = { value_type: newType };
                  if (newType === "top_n" || newType === "top_n_universe") {
                    updates.operator = "top";
                    updates.ranking_order = "Descending";
                    updates.value = rule.value || 100;
                    updates.value_indicator = "";
                    updates.value_lookback = 0;
                  } else if (newType === "value") {
                    updates.operator = rule.operator === "top" ? ">=" : rule.operator;
                    updates.ranking_order = undefined;
                  } else {
                    updates.operator = rule.operator === "top" ? ">=" : rule.operator;
                    updates.ranking_order = undefined;
                  }
                  onChange({ ...rule, ...updates } as Rule);
                }}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
            >
                <option value="">-- Select --</option>
                {Object.entries(COMPARISON_TYPES).map(([key, lbl]) => (
                <option key={key} value={key}>
                    {lbl}
                </option>
                ))}
            </select>
            </div>

            {/* ── Top N fields (shown for both top_n and top_n_universe) ── */}
            {(valueType === "top_n" || valueType === "top_n_universe") && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Top N</label>
                <input
                  type="number"
                  min={1}
                  value={rule.value || 100}
                  onChange={(e) => onChange({ ...rule, value: +e.target.value })}
                  className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Order</label>
                <select
                  value={rule.ranking_order || "Descending"}
                  onChange={(e) => onChange({ ...rule, ranking_order: e.target.value })}
                  className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                >
                  <option value="Descending">Highest</option>
                  <option value="Ascending">Lowest</option>
                </select>
              </div>
            </>
            )}

            {/* ── Value (numeric threshold) ── */}
            {valueType === "value" && (
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Value</label>
                <input
                type="number"
                value={rule.value}
                onChange={(e) => onChange({ ...rule, value: +e.target.value })}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                />
            </div>
            )}

            {/* ── Indicator price fields ── */}
            {valueType === "indicator_price" && (
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Compare To</label>
                <select
                value={rule.value_indicator}
                onChange={(e) => onChange({ ...rule, value_indicator: e.target.value })}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                >
                <option value="">-- Select --</option>
                {Object.entries(_marketIndicators).map(([key, lbl]) => (
                    <option key={key} value={key}>
                    {lbl}
                    </option>
                ))}
                </select>
            </div>
            )}

            {valueType === "indicator_price" && (getMeta(rule.value_indicator ?? "")?.hasLookback ?? true) && (
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Lookback</label>
                <input
                type="number"
                value={rule.value_lookback}
                onChange={(e) => onChange({ ...rule, value_lookback: +e.target.value })}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                />
            </div>
            )}
            {/* Compare To Range % */}
            {valueType === "indicator_price" && (getMeta(rule.value_indicator ?? "")?.hasRange ?? false) && (
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Range %</label>
                <input
                type="number"
                value={rule.value_range_percent}
                onChange={(e) => onChange({ ...rule, value_range_percent: +e.target.value })}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                />
            </div>
            )}
            </> /* end isMonthIn else */
            )} {/* end isMonthIn ternary */}

        </>
        ) : (
        // ✅ Boolean indicator UI (simple)
        <div className="sm:col-span-4 text-sm text-gray-600">
            This indicator returns <b>true/false</b>. It will be treated as <b>TRUE</b>.
        </div>
        )}

      <div className="flex items-end gap-2">
        <button type="button" onClick={onRemove} className="text-red-600 text-xs hover:underline">
          Remove
        </button>
      </div>
    </div>
    )} {/* end isMonthIn ternary */}
    </>
  );
}