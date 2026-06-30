import { Rule, RuleTree, RuleNode } from "../model/MarketRegime.ts";

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const ruleNode = (r: Rule): RuleNode => ({ type: "rule", id: uid(), rule: r });

/**
 * Convert flat Rule[] (with connectors) into a RuleTree.
 * Precedence: AND groups inside OR root.
 */
export function rulesToTree(rules: Rule[], defaultLogic: "AND" | "OR" = "AND"): RuleTree {
  if (!rules || rules.length === 0) {
    return { type: "group", id: "root", logic: defaultLogic, children: [] };
  }

  // Split by OR boundaries (OR has lower precedence)
  const orGroups: Rule[][] = [];
  let current: Rule[] = [rules[0]];

  for (let i = 0; i < rules.length - 1; i++) {
    const conn = (rules[i].connector || "AND").toUpperCase();

    if (conn === "OR") {
      orGroups.push(current);
      current = [rules[i + 1]];
    } else {
      current.push(rules[i + 1]);
    }
  }
  orGroups.push(current);

  // If we have multiple OR groups → root is OR with AND subgroups
  if (orGroups.length > 1) {
    return {
      type: "group",
      id: "root",
      logic: "OR",
      children: orGroups.map((g) => ({
        type: "group",
        id: uid(),
        logic: "AND",
        children: g.map(ruleNode),
      })),
    };
  }

  // Only one group → root is AND with rules
  return {
    type: "group",
    id: "root",
    logic: "AND",
    children: orGroups[0].map(ruleNode),
  };
}
