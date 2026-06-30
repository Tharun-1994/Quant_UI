import React from "react";
import {
  RANKING_ORDERS,
  LRA_COMPARISON_OPERATORS,
} from "../constants/options.ts";
import { treeToEnglish } from "../utils/lraHelpers.ts";

interface Props {
  value: any;
  onChange: (v: any) => void;
  /** Indicator names from the registry — drives the indicator dropdown. */
  indicators?: string[];
  /** Classification field names — drives the value_indicator dropdown. */
  classificationFields?: string[];
}

type Node = any;

const isGroup = (n: any) => n && n.type === "group";

const newGroup = (): Node => ({ type: "group", logic: "AND", children: [] });
const newComparisonLeaf = (): Node => ({
  indicator: "",
  lookback: 0,
  operator: ">=",
  value: 0,
});
const newTopNLeaf = (): Node => ({
  indicator: "",
  operator: "top_n_universe",
  params: { N: 2, direction: "asc" },
});

// Context so deeply-nested LeafView can read the indicator + classification
// field lists without prop drilling through GroupView/NodeView.
const LegTreeContext = React.createContext<{
  indicators: string[];
  classificationFields: string[];
}>({ indicators: [], classificationFields: [] });

const LegTreeEditor: React.FC<Props> = ({
  value,
  onChange,
  indicators = [],
  classificationFields = [],
}) => {
  const root = isGroup(value) ? value : newGroup();
  const englishSummary = treeToEnglish(root);
  return (
    <LegTreeContext.Provider value={{ indicators, classificationFields }}>
      <div className="space-y-2">
        <p className="text-xs text-gray-500 mb-2">
          Build the per-leg entry rule tree. AND/OR groups combine children;
          leaves filter the universe via comparison or top_n_universe ranking.
        </p>
        <NodeView node={root} onChange={onChange} isRoot />

        {/* Plain-English preview — Patch 40 */}
        <div className="mt-3 rounded-md p-3 bg-indigo-50 border border-indigo-200">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 mb-1">
            In plain English
          </div>
          <div className="text-xs text-indigo-900 leading-relaxed">
            {englishSummary}
          </div>
        </div>
      </div>
    </LegTreeContext.Provider>
  );
};

const NodeView: React.FC<{
  node: Node;
  onChange: (v: Node) => void;
  isRoot?: boolean;
  onRemove?: () => void;
}> = ({ node, onChange, isRoot, onRemove }) =>
  isGroup(node) ? (
    <GroupView node={node} onChange={onChange} isRoot={isRoot} onRemove={onRemove} />
  ) : (
    <LeafView node={node} onChange={onChange} onRemove={onRemove} />
  );

const GroupView: React.FC<{
  node: Node;
  onChange: (v: Node) => void;
  isRoot?: boolean;
  onRemove?: () => void;
}> = ({ node, onChange, isRoot, onRemove }) => {
  const children = Array.isArray(node.children) ? node.children : [];

  const setChild = (i: number, v: Node) => {
    const next = [...children];
    next[i] = v;
    onChange({ ...node, children: next });
  };
  const removeChild = (i: number) => {
    onChange({ ...node, children: children.filter((_: any, j: number) => j !== i) });
  };
  const addLeaf = (kind: "comparison" | "top_n") => {
    const leaf = kind === "top_n" ? newTopNLeaf() : newComparisonLeaf();
    onChange({ ...node, children: [...children, leaf] });
  };
  const addGroup = () => {
    onChange({ ...node, children: [...children, newGroup()] });
  };

  return (
    <div
      className={`border-l-4 ${
        isRoot ? "border-indigo-500" : "border-indigo-300"
      } pl-3 py-2 rounded-r ${isRoot ? "bg-indigo-50" : "bg-gray-50"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs font-semibold">Logic:</label>
        <select
          value={node.logic ?? "AND"}
          onChange={(e) => onChange({ ...node, logic: e.target.value })}
          className="border rounded px-2 py-0.5 text-xs"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        {!isRoot && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto text-xs px-2 py-0.5 bg-red-500 text-white rounded"
          >
            Remove group
          </button>
        )}
      </div>

      <div className="space-y-2">
        {children.map((c: any, i: number) => (
          <NodeView
            key={i}
            node={c}
            onChange={(v) => setChild(i, v)}
            onRemove={() => removeChild(i)}
          />
        ))}
        {children.length === 0 && (
          <div className="text-xs text-gray-500 italic">
            No children — add leaves or sub-groups below.
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => addLeaf("comparison")}
          className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + Comparison
        </button>
        <button
          type="button"
          onClick={() => addLeaf("top_n")}
          className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + Top-N universe
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="text-xs px-2 py-0.5 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          + Sub-group
        </button>
      </div>
    </div>
  );
};

const LeafView: React.FC<{
  node: Node;
  onChange: (v: Node) => void;
  onRemove?: () => void;
}> = ({ node, onChange, onRemove }) => {
  const { indicators, classificationFields } = React.useContext(LegTreeContext);
  const isTopN = node.operator === "top_n_universe";
  const isClassificationValue =
    node.value_indicator !== undefined && node.value_indicator !== null;

  // Indicator dropdown: registry + always include the currently-set value so
  // an unrecognized indicator doesn't silently disappear from the UI.
  const indicatorOptions = (() => {
    const set = new Set<string>(indicators);
    if (node.indicator) set.add(node.indicator);
    return Array.from(set).sort();
  })();

  // Classification field dropdown: derive from regime's ticker_classification.
  // Fall back to the known LRA fields when classification table is empty.
  const fieldOptions = (() => {
    const set = new Set<string>(classificationFields);
    if (set.size === 0) {
      ["risk", "range_tier", "min_daily_range_pct"].forEach((f) => set.add(f));
    }
    if (node.value_indicator) set.add(node.value_indicator);
    return Array.from(set).sort();
  })();

  if (isTopN) {
    return (
      <div className="border rounded p-2 bg-white flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-indigo-700">Top-N universe</span>
        <select
          value={node.indicator ?? ""}
          onChange={(e) => onChange({ ...node, indicator: e.target.value })}
          className="border rounded px-2 py-0.5"
        >
          <option value="">— indicator —</option>
          {indicatorOptions.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        <span>N=</span>
        <input
          type="number"
          min={1}
          value={node.params?.N ?? 2}
          onChange={(e) =>
            onChange({
              ...node,
              params: {
                ...(node.params || {}),
                N: parseInt(e.target.value || "1", 10),
              },
            })
          }
          className="border rounded px-2 py-0.5 w-16"
        />
        <select
          value={node.params?.direction ?? "asc"}
          onChange={(e) =>
            onChange({
              ...node,
              params: { ...(node.params || {}), direction: e.target.value },
            })
          }
          className="border rounded px-2 py-0.5"
        >
          {Object.entries(RANKING_ORDERS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto px-2 py-0.5 bg-red-500 text-white rounded"
          >
            Remove
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded p-2 bg-white flex flex-wrap items-center gap-2 text-xs">
      <select
        value={node.indicator ?? ""}
        onChange={(e) => onChange({ ...node, indicator: e.target.value })}
        className="border rounded px-2 py-0.5"
      >
        <option value="">— indicator —</option>
        {indicatorOptions.map((ind) => (
          <option key={ind} value={ind}>{ind}</option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        value={node.lookback ?? 0}
        onChange={(e) =>
          onChange({ ...node, lookback: parseInt(e.target.value || "0", 10) })
        }
        title="lookback"
        className="border rounded px-2 py-0.5 w-16"
      />
      <select
        value={node.operator ?? ">="}
        onChange={(e) => onChange({ ...node, operator: e.target.value })}
        className="border rounded px-2 py-0.5"
      >
        {Object.entries(LRA_COMPARISON_OPERATORS).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>
      <select
        value={isClassificationValue ? "classification" : "literal"}
        onChange={(e) => {
          const next = { ...node };
          if (e.target.value === "classification") {
            next.value_indicator = fieldOptions[0] || "";
            delete next.value;
          } else {
            next.value = 0;
            delete next.value_indicator;
          }
          onChange(next);
        }}
        className="border rounded px-2 py-0.5"
        title="value source"
      >
        <option value="literal">value</option>
        <option value="classification">classification field</option>
      </select>
      {isClassificationValue ? (
        <select
          value={node.value_indicator ?? ""}
          onChange={(e) => onChange({ ...node, value_indicator: e.target.value })}
          className="border rounded px-2 py-0.5"
        >
          <option value="">— field —</option>
          {fieldOptions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          step="any"
          value={node.value ?? 0}
          onChange={(e) =>
            onChange({ ...node, value: parseFloat(e.target.value || "0") })
          }
          className="border rounded px-2 py-0.5 w-24"
        />
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto px-2 py-0.5 bg-red-500 text-white rounded"
        >
          Remove
        </button>
      )}
    </div>
  );
};

export default LegTreeEditor;