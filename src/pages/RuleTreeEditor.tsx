import React, { useEffect, useMemo } from "react";
import type { Rule, RuleTree, RuleNode, Logic } from "../model/MarketRegime";

import {
  INDICATORS,
  OPERATORS,
  COMPARISON_TYPES,
  MARKET_INDICATORS,
  INDICATOR_META,
} from "../constants/options.ts";

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

  const meta = INDICATOR_META[r.indicator];
  const isBoolean = meta?.kind === "boolean";

  // ✅ N-week occurrence / boolean indicators use params
  if (isBoolean) {
    const p = r.params || {};
    // adjust keys to whatever you used in INDICATOR_META params
    const windowDays = p.n_week_days ?? 252;
    const occurredWithinDays = p.within_days ?? 20;

    return `${r.indicator}(${windowDays}, ${occurredWithinDays})`;
  }

  // existing logic for normal indicators
  if (!r.operator) return "";
  const left = `${r.indicator}_${r.lookback ?? 0}`;

  const vt = r.value_type || (r.value > 0 ? "value" : "indicator_price");

  if (vt === "value") return `${left} ${r.operator} ${Number(r.value)}`;

  const right = r.value_indicator ? `${r.value_indicator}_${r.value_lookback ?? 0}` : "???";
  return `${left} ${r.operator} ${right}`;
}


function nodeToExpr(node: RuleNode): string {
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
};

const RulesTreeEditor: React.FC<Props> = ({ label, tree, onChange, showPreview = true }) => {
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

export default RulesTreeEditor;

// ---------- sub components ----------
function NodeEditor({
  node,
  depth,
  onChangeNode,
  onDeleteNode,
}: {
  node: RuleNode;
  depth: number;
  onChangeNode: (id: string, updater: (n: RuleNode) => RuleNode) => void;
  onDeleteNode: (id: string) => void;
}) {
  if (node.type === "rule") {
    return (
      <RuleRow
        rule={node.rule}
        onChange={(r) => onChangeNode(node.id, () => ({ type: "rule", id: node.id, rule: r }))}
        onRemove={() => onDeleteNode(node.id)}
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
}: {
  rule: Rule;
  onChange: (r: Rule) => void;
  onRemove: () => void;
}) {
  const valueType = rule.value_type || (rule.value > 0 ? "value" : "indicator_price");

  const meta = INDICATOR_META[rule.indicator];
  const isBoolean = meta?.kind === "boolean";
  const params = rule.params || {};

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
      {/* Indicator */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Indicator</label>
        <select
          value={rule.indicator}
            onChange={(e) => {
            const selected = e.target.value;
            const nextMeta = INDICATOR_META[selected];
            const nextIsBoolean = nextMeta?.kind === "boolean";

            // build default params if defined in meta
            const nextParams: Record<string, any> = {};
            (nextMeta?.params || []).forEach((p: any) => {
                nextParams[p.key] = p.default ?? "";
            });

            const next: Rule = {
              ...rule,
              indicator: selected,

              lookback: selected === "crsi" ? 2 : 0,

              operator: nextIsBoolean ? "IS_TRUE" : rule.operator,
              value_type: nextIsBoolean ? "value" : rule.value_type,
              value: nextIsBoolean ? 1 : rule.value,

              // ✅ CLEAR stale compare fields so "unadjusted_close" doesn't leak in
              value_indicator: nextIsBoolean ? "" : rule.value_indicator,
              value_lookback: nextIsBoolean ? 0 : rule.value_lookback,

              // optional: if you have label/connector etc you can keep them
              params: (nextMeta?.params?.length ? nextParams : undefined),
            };


            onChange(next);
            }}

          className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
        >
          <option value="">-- Select --</option>
          {Object.entries(INDICATORS).map(([key, lbl]) => (
            <option key={key} value={key}>
              {lbl}
            </option>
          ))}
        </select>
      </div>

      {/* Lookback */}
      {(INDICATOR_META[rule.indicator]?.hasLookback ?? true) && (
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
            {Object.entries(MARKET_INDICATORS).map(([key, lbl]) => (
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
            {/* Operator */}
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

            {/* Value Type */}
            <div>
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
            </div>

            {/* Value */}
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

            {/* Compare To */}
            {valueType === "indicator_price" && (
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Compare To</label>
                <select
                value={rule.value_indicator}
                onChange={(e) => onChange({ ...rule, value_indicator: e.target.value })}
                className="w-full border px-2 py-1 rounded focus:ring focus:ring-indigo-200"
                >
                <option value="">-- Select --</option>
                {Object.entries(MARKET_INDICATORS).map(([key, lbl]) => (
                    <option key={key} value={key}>
                    {lbl}
                    </option>
                ))}
                </select>
            </div>
            )}

            {/* Compare To Lookback */}
            {valueType === "indicator_price" && (INDICATOR_META[rule.value_indicator]?.hasLookback ?? true) && (
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
            {valueType === "indicator_price" && (INDICATOR_META[rule.value_indicator]?.hasRange ?? false) && (
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
  );
}
