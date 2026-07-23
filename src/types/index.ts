// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Core Domain Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * How a criterion should be scored.
 * SUBJECTIVE                 → user pairwise-compares options via the wizard
 * OBJECTIVE_HIGHER_IS_BETTER → auto-derived from raw numeric values (e.g. size, salary)
 * OBJECTIVE_LOWER_IS_BETTER  → auto-derived, inverted (e.g. price, commute time)
 */
export enum CriterionType {
  SUBJECTIVE = "SUBJECTIVE",
  OBJECTIVE_HIGHER_IS_BETTER = "OBJECTIVE_HIGHER_IS_BETTER",
  OBJECTIVE_LOWER_IS_BETTER = "OBJECTIVE_LOWER_IS_BETTER",
}

export interface Criterion {
  id: string;
  name: string;
  /** Final normalized weight (0–1), computed by the engine — not user-entered directly. */
  weight: number;
  type: CriterionType;
}

export interface Option {
  id: string;
  name: string;
  /**
   * Raw numeric values keyed by Criterion.id — only populated for criteria
   * whose type is OBJECTIVE_HIGHER_IS_BETTER / OBJECTIVE_LOWER_IS_BETTER.
   * e.g. { "criterion_price": 1450, "criterion_size_sqm": 62 }
   */
  objectiveValues: Record<string, number>;
}

/** A square pairwise comparison matrix. matrix[i][j] = "how much more important/preferred is i over j". */
export type PairwiseMatrix = number[][];

/** Result of running the AHP engine on a single pairwise matrix. */
export interface AhpResult {
  /** Normalized priority vector — sums to 1.0, one entry per row/column of the input matrix. */
  weights: number[];
  lambdaMax: number;
  consistencyIndex: number;
  consistencyRatio: number;
  /** True when CR > 0.1 — the comparisons are logically inconsistent and the UI should warn the user. */
  isInconsistent: boolean;
}

/** A single pairwise judgement captured from the wizard's slider UI. Value uses Saaty's 1–9 scale, signed. */
export interface PairwiseJudgement {
  /** id of the "row" item (criterion id, or option id within a criterion's comparison set) */
  aId: string;
  /** id of the "column" item */
  bId: string;
  /**
   * Saaty scale value, signed:
   *   +1 = equal, +9 = a is extremely more important/preferred than b
   *   -9 = b is extremely more important/preferred than a (stored as negative for slider convenience)
   */
  value: number;
}

/** Which comparison set a judgement belongs to, for reconstructing matrices. */
export type ComparisonContext =
  | { kind: "CRITERIA" }
  | { kind: "OPTIONS_FOR_CRITERION"; criterionId: string };

export interface WizardAnswer {
  context: ComparisonContext;
  judgement: PairwiseJudgement;
}

/** Fully serializable decision state — this is what gets compressed into the URL hash. */
export interface DecisionState {
  version: 1;
  title: string;
  options: Option[];
  criteria: Criterion[];
  wizardAnswers: WizardAnswer[];
  phase: "SETUP" | "WIZARD" | "RESULTS";
}

/** Final computed score for one option, used in Phase 3. */
export interface OptionScore {
  optionId: string;
  optionName: string;
  totalScore: number;
  /** Per-criterion contribution, for the breakdown chart. */
  breakdown: { criterionId: string; criterionName: string; localWeight: number; contribution: number }[];
}
