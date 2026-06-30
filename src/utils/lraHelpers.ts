import { LRA_DEFAULT_CONFIG } from "../constants/lraDefaults.ts";
import type { MarketRegime } from "../model/MarketRegime";

/**
 * Returns the full 7-field LRA config to apply to a regime via Load Defaults.
 * Picks bull vs bear variant by sniffing the regime's trend label for "bear".
 */
export function getLraDefaultsForRegime(regime: MarketRegime) {
  const text = [
    regime.market_trend_type,
    (regime as any).market_trend_rules_labels,
  ].filter(Boolean).join(" ").toLowerCase();
  const isBear = /bear/.test(text);
  const variant = isBear ? LRA_DEFAULT_CONFIG.bear : LRA_DEFAULT_CONFIG.bull;
  return {
    ticker_classification:   LRA_DEFAULT_CONFIG.ticker_classification,
    pairing_entry_rules:     variant.pairing_entry_rules,
    pairing_exit_rules:      undefined,
    sizing_policy:           LRA_DEFAULT_CONFIG.sizing_policy,
    pair_exit_policy:        variant.pair_exit_policy,
    entry_rules_tree_long:   variant.entry_rules_tree_long,
    entry_rules_tree_short:  variant.entry_rules_tree_short,
  };
}

/** Walks an LRA leg rule tree and returns a plain-English description. */
export function treeToEnglish(node: any): string {
  if (!node) return "(empty)";
  if (node.type === "group") {
    const children = (node.children || []).map(treeToEnglish).filter(Boolean);
    if (children.length === 0) return "(empty)";
    if (children.length === 1) return children[0];
    const joiner = (node.logic || "AND") === "OR" ? " OR " : " AND ";
    return `(${children.join(joiner)})`;
  }
  // Leaf
  if (node.operator === "top_n_universe") {
    const N   = node.params?.N ?? "?";
    const dir = (node.params?.direction || "asc") === "desc" ? "highest" : "lowest";
    const ind = node.indicator || "(none)";
    return `pick ${N} tickers with ${dir} ${ind}`;
  }
  const ind = node.indicator || "(none)";
  const lb  = node.lookback ?? 0;
  const indStr = lb ? `${ind}(${lb})` : ind;
  const opMap: Record<string, string> = { ">=": "≥", "<=": "≤", "==": "=", "!=": "≠" };
  const opStr = opMap[node.operator] || node.operator || "?";
  const rhs = node.value_indicator
    ? `${node.value_indicator} (from classification)`
    : `${node.value ?? 0}`;
  return `${indStr} ${opStr} ${rhs}`;
}

/** Recursively collects every indicator name referenced anywhere in a tree. */
export function collectIndicatorRefs(node: any): string[] {
  const refs = new Set<string>();
  function walk(n: any) {
    if (!n) return;
    if (n.type === "group") {
      (n.children || []).forEach(walk);
    } else if (n.indicator) {
      refs.add(n.indicator);
    }
  }
  walk(node);
  return Array.from(refs);
}

export interface PreflightCheck {
  state: "ok" | "warn" | "err";
  text:  string;
}

/** Pre-flight readiness checks for an LRA-configured regime. */
export function computeLraPreflight(
  regime: MarketRegime,
  availableIndicators: string[],
): PreflightCheck[] {
  const checks: PreflightCheck[] = [];

  const tcCount = regime.ticker_classification
    ? Object.keys(regime.ticker_classification).length : 0;
  if (tcCount === 0) {
    checks.push({ state: "err", text: "Ticker Classification missing — 0 tickers" });
  } else {
    checks.push({ state: "ok", text: `${tcCount} tickers classified` });
  }

  const longTree = regime.entry_rules_tree_long as any;
  if (!longTree || !longTree.children?.length) {
    checks.push({ state: "err", text: "Entry Rules Tree (Long) missing" });
  } else {
    const refs = collectIndicatorRefs(longTree);
    const missing = availableIndicators.length
      ? refs.filter((r) => !availableIndicators.includes(r))
      : [];
    if (missing.length) {
      checks.push({ state: "warn", text: `Long tree references unknown indicators: ${missing.join(", ")}` });
    } else {
      checks.push({ state: "ok", text: `Long tree references: ${refs.join(", ") || "(none)"}` });
    }
  }

  const shortTree = regime.entry_rules_tree_short as any;
  if (!shortTree || !shortTree.children?.length) {
    checks.push({ state: "err", text: "Entry Rules Tree (Short) missing" });
  } else {
    const refs = collectIndicatorRefs(shortTree);
    const missing = availableIndicators.length
      ? refs.filter((r) => !availableIndicators.includes(r))
      : [];
    if (missing.length) {
      checks.push({ state: "warn", text: `Short tree references unknown indicators: ${missing.join(", ")}` });
    } else {
      checks.push({ state: "ok", text: `Short tree references: ${refs.join(", ") || "(none)"}` });
    }
  }

  const per = regime.pairing_entry_rules as any;
  if (!per) {
    checks.push({ state: "warn", text: "Pairing Entry Rules missing" });
  } else {
    const combos = (per.disallowed_combos || []).length;
    checks.push({ state: "ok", text: `Pairing Entry Rules: ${combos} disallowed combo${combos === 1 ? "" : "s"}` });
  }

  const sp = regime.sizing_policy as any;
  if (!sp) {
    checks.push({ state: "err", text: "Sizing Policy missing" });
  } else {
    const condOn = sp.params?.conditional_on;
    if (condOn && availableIndicators.length && !availableIndicators.includes(condOn)) {
      checks.push({ state: "warn", text: `Sizing Policy: '${condOn}' not in indicator registry` });
    } else {
      checks.push({ state: "ok", text: `Sizing Policy: ${sp.mode || "no mode"}` });
    }
  }

  const pep = regime.pair_exit_policy as any;
  if (!pep) {
    checks.push({ state: "err", text: "Pair Exit Policy missing — backtest cannot run" });
  } else {
    checks.push({ state: "ok", text: `Pair Exit Policy: max ${pep.max_hold_sessions ?? "?"} sessions` });
  }

  return checks;
}