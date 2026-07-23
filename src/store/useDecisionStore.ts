// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Centralized State (Zustand)
// ─────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import {
  ComparisonContext,
  Criterion,
  CriterionType,
  DecisionState,
  Option,
  OptionScore,
  PairwiseJudgement,
  PairwiseMatrix,
  WizardAnswer,
} from "../types";
import {
  createEmptyMatrix,
  evaluateMatrix,
  normalizeObjectiveValues,
  setPairwiseValue,
  synthesizeFinalScores,
  CriterionScoreSet,
} from "../lib/ahpEngine";
import { computeRequiredComparisons, RequiredComparison } from "../lib/comparisons";

// ── ID helper (no external uuid dependency) ────────────────────────────
const genId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * Converts a signed Saaty-scale value into the actual matrix ratio.
 * value ∈ [1, 9]   → a is that many times more important/preferred than b
 * value ∈ [-9, -1] → b is |value| times more important/preferred than a
 */
function toMatrixRatio(value: number): number {
  if (value >= 1) return value;
  if (value <= -1) return 1 / Math.abs(value);
  return 1; // treat anything in (-1, 1), e.g. 0, as "equal"
}

/** Reconstructs a full n×n reciprocal matrix from the sparse list of user judgements. */
function buildMatrixFromJudgements(
  ids: string[],
  judgements: PairwiseJudgement[]
): PairwiseMatrix {
  const matrix = createEmptyMatrix(ids.length);
  const indexOf = (id: string) => ids.indexOf(id);

  for (const j of judgements) {
    const i = indexOf(j.aId);
    const k = indexOf(j.bId);
    if (i === -1 || k === -1 || i === k) continue;
    setPairwiseValue(matrix, i, k, toMatrixRatio(j.value));
  }
  return matrix;
}

function sameContext(a: ComparisonContext, b: ComparisonContext) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function samePair(judgement: PairwiseJudgement, aId: string, bId: string) {
  return (
    (judgement.aId === aId && judgement.bId === bId) ||
    (judgement.aId === bId && judgement.bId === aId)
  );
}

interface DecisionStore {
  title: string;
  options: Option[];
  criteria: Criterion[];
  wizardAnswers: WizardAnswer[];
  phase: DecisionState["phase"];
  /** Index into computeRequiredComparisons(options, criteria) — drives Back/Next in the Wizard. */
  wizardCursor: number;

  // ── Phase 1: Setup ──
  setTitle: (title: string) => void;
  addOption: (name: string) => void;
  removeOption: (id: string) => void;
  addCriterion: (name: string, type: CriterionType) => void;
  removeCriterion: (id: string) => void;
  setCriterionType: (id: string, type: CriterionType) => void;
  setObjectiveValue: (optionId: string, criterionId: string, value: number) => void;
  /** Total number of pairwise judgements this decision currently requires — live counter for Setup. */
  getRequiredComparisonCount: () => number;

  // ── Phase 2: Wizard ──
  recordJudgement: (context: ComparisonContext, judgement: PairwiseJudgement) => void;
  getAllComparisons: () => RequiredComparison[];
  getExistingJudgementValue: (context: ComparisonContext, aId: string, bId: string) => number | null;
  /** Saves the answer for the current step, then advances — or finishes into Results if it was the last one. */
  answerCurrentAndAdvance: (value: number) => void;
  /** Steps back one comparison, or returns to Setup if already on the first comparison. */
  wizardBack: () => void;

  // ── Phase transitions ──
  goToSetup: () => void;
  goToWizard: () => void;
  goToResults: () => void;
  /** "Start Over with current data in place": clears answers, keeps Options/Criteria, returns to Setup. */
  restartWithCurrentData: () => void;
  /** "Clean Start Over": wipes everything. */
  reset: () => void;

  // ── Derived results (Phase 3) ──
  computeResults: () => { scores: OptionScore[]; criteriaInconsistent: boolean; criterionCRs: Record<string, number> };

  // ── Serialization ──
  hydrateFromState: (state: DecisionState) => void;
  exportState: () => DecisionState;
}

export const useDecisionStore = create<DecisionStore>((set, get) => ({
  title: "Untitled Decision",
  options: [],
  criteria: [],
  wizardAnswers: [],
  phase: "SETUP",
  wizardCursor: 0,

  setTitle: (title) => set({ title }),

  addOption: (name) =>
    set((s) => ({
      options: [...s.options, { id: genId("opt"), name, objectiveValues: {} }],
    })),

  removeOption: (id) =>
    set((s) => ({ options: s.options.filter((o) => o.id !== id) })),

  addCriterion: (name, type) =>
    set((s) => ({
      criteria: [...s.criteria, { id: genId("crit"), name, weight: 0, type }],
    })),

  removeCriterion: (id) =>
    set((s) => ({
      criteria: s.criteria.filter((c) => c.id !== id),
      wizardAnswers: s.wizardAnswers.filter(
        (a) => !(a.context.kind === "OPTIONS_FOR_CRITERION" && a.context.criterionId === id)
      ),
    })),

  setCriterionType: (id, type) =>
    set((s) => ({
      criteria: s.criteria.map((c) => (c.id === id ? { ...c, type } : c)),
    })),

  setObjectiveValue: (optionId, criterionId, value) =>
    set((s) => ({
      options: s.options.map((o) =>
        o.id === optionId
          ? { ...o, objectiveValues: { ...o.objectiveValues, [criterionId]: value } }
          : o
      ),
    })),

  getRequiredComparisonCount: () => {
    const { options, criteria } = get();
    return computeRequiredComparisons(options, criteria).length;
  },

  recordJudgement: (context, judgement) =>
    set((s) => {
      // Replace any existing answer for this exact pair+context, otherwise append.
      const filtered = s.wizardAnswers.filter(
        (a) => !(sameContext(a.context, context) && samePair(a.judgement, judgement.aId, judgement.bId))
      );
      return { wizardAnswers: [...filtered, { context, judgement }] };
    }),

  /** The full, stably-ordered comparison list for the current options/criteria. */
  getAllComparisons: () => {
    const { options, criteria } = get();
    return computeRequiredComparisons(options, criteria);
  },

  /** Looks up a previously-recorded answer (for prefilling the rating selector when stepping Back). */
  getExistingJudgementValue: (context, aId, bId) => {
    const { wizardAnswers } = get();
    const found = wizardAnswers.find(
      (a) => sameContext(a.context, context) && samePair(a.judgement, aId, bId)
    );
    if (!found) return null;
    // Normalize sign so it's always expressed relative to the (aId, bId) order passed in.
    return found.judgement.aId === aId ? found.judgement.value : -found.judgement.value;
  },

  answerCurrentAndAdvance: (value) => {
    const { options, criteria, wizardCursor, recordJudgement } = get();
    const all = computeRequiredComparisons(options, criteria);
    const current = all[wizardCursor];
    if (!current) return;

    recordJudgement(current.context, { aId: current.aId, bId: current.bId, value });

    const isLast = wizardCursor >= all.length - 1;
    if (isLast) {
      set({ phase: "RESULTS" });
    } else {
      set({ wizardCursor: wizardCursor + 1 });
    }
  },

  wizardBack: () => {
    const { wizardCursor } = get();
    if (wizardCursor <= 0) {
      set({ phase: "SETUP" });
    } else {
      set({ wizardCursor: wizardCursor - 1 });
    }
  },

  goToSetup: () => set({ phase: "SETUP" }),
  goToWizard: () => set({ phase: "WIZARD", wizardCursor: 0 }),
  goToResults: () => set({ phase: "RESULTS" }),

  restartWithCurrentData: () =>
    set({ wizardAnswers: [], wizardCursor: 0, phase: "SETUP" }),

  reset: () =>
    set({
      title: "Untitled Decision",
      options: [],
      criteria: [],
      wizardAnswers: [],
      wizardCursor: 0,
      phase: "SETUP",
    }),

  computeResults: () => {
    const { options, criteria, wizardAnswers } = get();
    const criterionCRs: Record<string, number> = {};
    let criteriaInconsistent = false;

    // Weight the criteria themselves
    let weightedCriteria = criteria;
    if (criteria.length > 1) {
      const matrix = buildMatrixFromJudgements(
        criteria.map((c) => c.id),
        wizardAnswers.filter((a) => a.context.kind === "CRITERIA").map((a) => a.judgement)
      );
      const result = evaluateMatrix(matrix);
      criteriaInconsistent = result.isInconsistent;
      weightedCriteria = criteria.map((c, i) => ({ ...c, weight: result.weights[i] }));
    } else if (criteria.length === 1) {
      weightedCriteria = [{ ...criteria[0], weight: 1 }];
    }

    // Score options within each criterion
    const criterionScoreSets: CriterionScoreSet[] = weightedCriteria.map((criterion) => {
      if (criterion.type === CriterionType.SUBJECTIVE) {
        const matrix = buildMatrixFromJudgements(
          options.map((o) => o.id),
          wizardAnswers
            .filter(
              (a) =>
                a.context.kind === "OPTIONS_FOR_CRITERION" &&
                a.context.criterionId === criterion.id
            )
            .map((a) => a.judgement)
        );
        const result = evaluateMatrix(matrix);
        criterionCRs[criterion.id] = result.consistencyRatio;
        return { criterionId: criterion.id, optionWeights: result.weights, ahp: result };
      }
      // Objective criteria: derived straight from raw values, no user input, always "consistent".
      const optionWeights = normalizeObjectiveValues(options, criterion);
      criterionCRs[criterion.id] = 0;
      return { criterionId: criterion.id, optionWeights };
    });

    const totals = synthesizeFinalScores(options, weightedCriteria, criterionScoreSets);

    const scores: OptionScore[] = options.map((option, idx) => ({
      optionId: option.id,
      optionName: option.name,
      totalScore: totals[idx].totalScore,
      breakdown: weightedCriteria.map((criterion) => {
        const set = criterionScoreSets.find((s) => s.criterionId === criterion.id)!;
        const localWeight = set.optionWeights[idx];
        return {
          criterionId: criterion.id,
          criterionName: criterion.name,
          localWeight,
          contribution: localWeight * criterion.weight,
        };
      }),
    }));

    scores.sort((a, b) => b.totalScore - a.totalScore);

    return { scores, criteriaInconsistent, criterionCRs };
  },

  hydrateFromState: (state) =>
    set({
      title: state.title,
      options: state.options,
      criteria: state.criteria,
      wizardAnswers: state.wizardAnswers,
      phase: state.phase,
      wizardCursor: 0,
    }),

  exportState: () => {
    const { title, options, criteria, wizardAnswers, phase } = get();
    return { version: 1, title, options, criteria, wizardAnswers, phase };
  },
}));
