// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Required Comparisons
// A single source of truth for "which pairwise comparisons does this
// decision need?" — used by the Setup screen's live matchup counter AND
// the Wizard's step-by-step (back/next) navigation, so the two always agree.
// ─────────────────────────────────────────────────────────────────────────

import { ComparisonContext, Criterion, CriterionType, Option } from "../types";

export interface RequiredComparison {
  context: ComparisonContext;
  aId: string;
  bId: string;
  aLabel: string;
  bLabel: string;
  /**
   * Present ONLY for OPTIONS_FOR_CRITERION comparisons — the name of the specific
   * subjective criterion this option-vs-option judgement is scoped to. The wizard
   * uses this to render "Regarding {criterionName}, which do you prefer?" and must
   * never fall back to a generic, criterion-less "A vs B" question.
   */
  criterionName?: string;
}

/** All unique pairs (i < j) needed to fully populate an n-item comparison set. */
export function requiredPairs(ids: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]]);
    }
  }
  return pairs;
}

/**
 * Builds the full, stably-ordered list of comparisons this decision requires:
 *   1. Criteria vs. criteria (only if there's more than one criterion)
 *   2. Options vs. options — ONLY within SUBJECTIVE criteria (objective
 *      criteria are fully skipped; the math engine derives those from numbers)
 *
 * The order is deterministic given the same options/criteria arrays, which is
 * what lets the Wizard move Back/Next through a stable index.
 */
export function computeRequiredComparisons(
  options: Option[],
  criteria: Criterion[]
): RequiredComparison[] {
  const list: RequiredComparison[] = [];

  if (criteria.length > 1) {
    for (const [aId, bId] of requiredPairs(criteria.map((c) => c.id))) {
      const a = criteria.find((c) => c.id === aId)!;
      const b = criteria.find((c) => c.id === bId)!;
      list.push({ context: { kind: "CRITERIA" }, aId, bId, aLabel: a.name, bLabel: b.name });
    }
  }

  const subjectiveCriteria = criteria.filter((c) => c.type === CriterionType.SUBJECTIVE);
  for (const criterion of subjectiveCriteria) {
    if (options.length < 2) continue;
    const context: ComparisonContext = { kind: "OPTIONS_FOR_CRITERION", criterionId: criterion.id };
    for (const [aId, bId] of requiredPairs(options.map((o) => o.id))) {
      const a = options.find((o) => o.id === aId)!;
      const b = options.find((o) => o.id === bId)!;
      // criterionName is mandatory here — this is what stops the wizard from ever
      // asking a generic "Option A vs Option B" without a criterion attached.
      list.push({ context, aId, bId, aLabel: a.name, bLabel: b.name, criterionName: criterion.name });
    }
  }

  return list;
}