// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — AHP Math Engine
// Pure, dependency-free TypeScript. No external math libraries.
// ─────────────────────────────────────────────────────────────────────────

import {
  AhpResult,
  Criterion,
  CriterionType,
  Option,
  PairwiseMatrix,
} from "../types";

/**
 * Saaty's Random Index (RI) lookup table, used to normalize CI into CR.
 * Index = matrix size (n). n=1,2 have no meaningful inconsistency, RI=0.
 */
const RANDOM_INDEX: Record<number, number> = {
  1: 0.0,
  2: 0.0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

/** Builds an n×n identity-diagonal matrix of 1s, ready to be filled with judgements. */
export function createEmptyMatrix(n: number): PairwiseMatrix {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

/**
 * Sets matrix[i][j] = value and matrix[j][i] = 1/value, preserving reciprocal consistency.
 * Mutates and returns the same matrix for convenience.
 */
export function setPairwiseValue(
  matrix: PairwiseMatrix,
  i: number,
  j: number,
  value: number
): PairwiseMatrix {
  matrix[i][j] = value;
  matrix[j][i] = 1 / value;
  return matrix;
}

/**
 * Geometric Mean Method for deriving a priority vector from a pairwise comparison matrix.
 * For each row: take the n-th root of the product of its entries, then normalize so
 * all resulting weights sum to 1.0.
 */
export function geometricMeanWeights(matrix: PairwiseMatrix): number[] {
  const n = matrix.length;
  const rowGeoMeans = matrix.map((row) => {
    const product = row.reduce((acc, v) => acc * v, 1);
    return Math.pow(product, 1 / n);
  });
  const sum = rowGeoMeans.reduce((a, b) => a + b, 0);
  return rowGeoMeans.map((v) => v / sum);
}

/**
 * Approximates λ_max (principal eigenvalue) using the standard AHP shortcut:
 * multiply the matrix by the priority vector, then average the ratio of each
 * resulting entry to its corresponding weight.
 */
export function estimateLambdaMax(matrix: PairwiseMatrix, weights: number[]): number {
  const n = matrix.length;
  const weightedSums = matrix.map((row) =>
    row.reduce((acc, v, j) => acc + v * weights[j], 0)
  );
  const ratios = weightedSums.map((ws, i) => ws / weights[i]);
  return ratios.reduce((a, b) => a + b, 0) / n;
}

/**
 * Full AHP evaluation of a single pairwise matrix: priority vector, λ_max,
 * Consistency Index (CI), and Consistency Ratio (CR = CI / RI).
 * isInconsistent is true when CR > 0.10, the conventional AHP threshold.
 */
export function evaluateMatrix(matrix: PairwiseMatrix): AhpResult {
  const n = matrix.length;
  const weights = geometricMeanWeights(matrix);

  if (n <= 2) {
    // A 1x1 or 2x2 reciprocal matrix is always perfectly consistent by construction.
    return { weights, lambdaMax: n, consistencyIndex: 0, consistencyRatio: 0, isInconsistent: false };
  }

  const lambdaMax = estimateLambdaMax(matrix, weights);
  const consistencyIndex = (lambdaMax - n) / (n - 1);
  const ri = RANDOM_INDEX[n] ?? RANDOM_INDEX[10]; // fall back to largest tabulated RI for very large n
  const consistencyRatio = ri === 0 ? 0 : consistencyIndex / ri;

  return {
    weights,
    lambdaMax,
    consistencyIndex,
    consistencyRatio,
    isInconsistent: consistencyRatio > 0.1,
  };
}

// ───────────────────────────────────────────────────────────────────────
// Objective criteria auto-population
// ───────────────────────────────────────────────────────────────────────

/**
 * Builds a pairwise comparison matrix automatically from raw numeric values,
 * eliminating the need for the user to manually judge objective criteria.
 *
 * HIGHER_IS_BETTER: cell[i][j] = value(i) / value(j)
 * LOWER_IS_BETTER : cell[i][j] = value(j) / value(i)   (inverted, so smaller raw values win)
 *
 * A zero or missing value is treated as a very small epsilon to avoid divide-by-zero,
 * while still letting relative comparisons resolve sensibly.
 */
export function buildObjectiveMatrix(
  options: Option[],
  criterion: Criterion
): PairwiseMatrix {
  const EPS = 1e-6;
  const values = options.map((o) => {
    const raw = o.objectiveValues[criterion.id];
    return raw && raw > 0 ? raw : EPS;
  });

  const n = values.length;
  const matrix = createEmptyMatrix(n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }
      matrix[i][j] =
        criterion.type === CriterionType.OBJECTIVE_HIGHER_IS_BETTER
          ? values[i] / values[j]
          : values[j] / values[i];
    }
  }

  return matrix;
}

/**
 * Derives normalized (0–1, sum-to-1) option scores directly from raw values for an
 * objective criterion, bypassing the pairwise matrix entirely. This is the numerically
 * cleanest way to ensure units (dollars vs. sqm vs. minutes) never skew the final
 * weighted result — each criterion's contribution is scale-free by construction.
 */
export function normalizeObjectiveValues(
  options: Option[],
  criterion: Criterion
): number[] {
  const EPS = 1e-6;
  const raw = options.map((o) => {
    const v = o.objectiveValues[criterion.id];
    return v && v > 0 ? v : EPS;
  });

  // Invert lower-is-better values (e.g. price) so that, after normalization,
  // a cheaper option still yields a larger share of the criterion's weight.
  const transformed =
    criterion.type === CriterionType.OBJECTIVE_LOWER_IS_BETTER
      ? raw.map((v) => 1 / v)
      : raw;

  const sum = transformed.reduce((a, b) => a + b, 0);
  return transformed.map((v) => v / sum);
}

// ───────────────────────────────────────────────────────────────────────
// Final synthesis: combine criteria weights × per-criterion option scores
// ───────────────────────────────────────────────────────────────────────

export interface CriterionScoreSet {
  criterionId: string;
  /** Option priority vector for this criterion, aligned by index to the `options` array. */
  optionWeights: number[];
  ahp?: AhpResult; // present only for SUBJECTIVE criteria (objective ones skip pairwise CR checks)
}

/**
 * Computes final weighted totals for every option:
 *   totalScore(option) = Σ over criteria of [ criterionWeight × optionWeightWithinCriterion ]
 */
export function synthesizeFinalScores(
  options: Option[],
  criteria: Criterion[],
  criterionScoreSets: CriterionScoreSet[]
): { optionId: string; totalScore: number }[] {
  return options.map((option, optionIdx) => {
    const totalScore = criteria.reduce((sum, criterion) => {
      const scoreSet = criterionScoreSets.find((s) => s.criterionId === criterion.id);
      const localWeight = scoreSet?.optionWeights[optionIdx] ?? 0;
      return sum + criterion.weight * localWeight;
    }, 0);
    return { optionId: option.id, totalScore };
  });
}
