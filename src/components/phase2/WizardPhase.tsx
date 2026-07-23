// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Phase 2: The Wizard
//
// Two rules enforced end-to-end here:
//   1. Every option-vs-option question is explicitly scoped to one named
//      subjective criterion ("Regarding Design, which do you prefer?") —
//      never a bare "Option A vs Option B".
//   2. Objective criteria never appear here at all — computeRequiredComparisons
//      already excludes them; the math engine derives those from raw numbers.
//
// Rating scale: 11 circles, odd count, dead-center circle = "Equally Important"
// and is the default selection. Exactly one circle per preference tier.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDecisionStore } from "../../store/useDecisionStore";
import Button from "../common/Button";

// 5 distinct preference tiers per side + 1 center = 11 circles, odd and symmetric.
// Index 5 (the middle one) is always "Equally Important" — one circle, one tier, no overlap.
const CENTER_INDEX = 5;
const DOT_COUNT = 11;
const TIER_MAGNITUDES = [2, 3, 5, 7, 9]; // step 1..5 out from center
const TIER_LABELS = ["Slightly", "Moderately", "Strongly", "Very strongly", "Extremely"];

/** index 0..10 → signed Saaty value. Positive = A preferred, negative = B preferred. */
function indexToSignedValue(index: number): number {
  const distance = index - CENTER_INDEX;
  if (distance === 0) return 1;
  const magnitude = TIER_MAGNITUDES[Math.abs(distance) - 1];
  return distance < 0 ? magnitude : -magnitude;
}

/** signed Saaty value → index 0..10. Unanswered (null) resolves to the center default. */
function signedValueToIndex(value: number | null): number {
  if (value === null || value === 1) return CENTER_INDEX;
  const magnitude = Math.abs(value);
  const tier = TIER_MAGNITUDES.indexOf(magnitude);
  if (tier === -1) return CENTER_INDEX; // defensive fallback for any legacy/out-of-range data
  return value > 0 ? CENTER_INDEX - (tier + 1) : CENTER_INDEX + (tier + 1);
}

export default function WizardPhase() {
  const answerCurrentAndAdvance = useDecisionStore((s) => s.answerCurrentAndAdvance);
  const wizardBack = useDecisionStore((s) => s.wizardBack);
  const goToResults = useDecisionStore((s) => s.goToResults);
  const wizardCursor = useDecisionStore((s) => s.wizardCursor);
  const getAllComparisons = useDecisionStore((s) => s.getAllComparisons);
  const getExistingJudgementValue = useDecisionStore((s) => s.getExistingJudgementValue);

  const all = getAllComparisons();
  const current = all[wizardCursor];
  const isFirst = wizardCursor === 0;
  const isLast = wizardCursor === all.length - 1;

  const [selectedIndex, setSelectedIndex] = useState<number>(CENTER_INDEX);

  // Prefill from any previously-recorded answer whenever the active comparison changes.
  useEffect(() => {
    if (!current) return;
    const existing = getExistingJudgementValue(current.context, current.aId, current.bId);
    setSelectedIndex(signedValueToIndex(existing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.aId, current?.bId, wizardCursor]);

  if (all.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-screen-xl flex-col items-center justify-center gap-6 px-4 py-16 text-center text-brand-50 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold">Nothing to compare.</h2>
        <p className="text-brand-300">
          Every criterion is objective, so the math engine already has everything it needs.
        </p>
        <Button onClick={goToResults}>See results →</Button>
      </div>
    );
  }

  const distance = selectedIndex - CENTER_INDEX;
  const aActive = distance < 0;
  const bActive = distance > 0;
  const intensity = Math.abs(distance) / 5; // 0 (center) .. 1 (extreme)

  const statusLabel =
    distance === 0
      ? "Equally important"
      : `${aActive ? current.aLabel : current.bLabel} is ${TIER_LABELS[Math.abs(distance) - 1].toLowerCase()} preferred`;

  // Rule enforcement, made visible: option-level questions ALWAYS name their criterion.
  const questionLabel =
    current.context.kind === "CRITERIA"
      ? "Which matters more to you?"
      : `Regarding ${current.criterionName}, which do you prefer?`;

  function handleNext() {
    answerCurrentAndAdvance(indexToSignedValue(selectedIndex));
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-screen-xl flex-col justify-center px-4 py-10 text-brand-50 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-center text-xs uppercase tracking-widest text-brand-400">{questionLabel}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.aId + current.bId + (current.criterionName ?? "")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="relative mt-8 flex items-center justify-between gap-3 sm:gap-6"
          >
            <FlameCard label={current.aLabel} active={aActive} intensity={intensity} />

            <div className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-brand-400 bg-surface-950 text-xs font-extrabold text-brand-300 shadow-[0_0_16px_rgba(52,153,96,0.45)] sm:h-12 sm:w-12">
              VS
            </div>

            <FlameCard label={current.bLabel} active={bActive} intensity={intensity} />
          </motion.div>
        </AnimatePresence>

        {/* 11-point discrete rating bar: odd count, one circle per tier, true center = equal */}
        <div className="mt-10 flex items-center justify-center gap-1 sm:gap-1.5">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <RatingDot key={i} index={i} selectedIndex={selectedIndex} onSelect={() => setSelectedIndex(i)} />
          ))}
        </div>
        <p className="mt-3 text-center text-sm font-medium text-brand-200">{statusLabel}</p>

        <div className="mt-8 flex gap-3">
          <Button variant="secondary" onClick={wizardBack} className="flex-1">
            {isFirst ? "Go to starting page" : "Back"}
          </Button>
          <Button onClick={handleNext} className="flex-1">
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-brand-500">
          Comparison {wizardCursor + 1} of {all.length}
        </p>
      </div>
    </div>
  );
}

function RatingDot({
  index,
  selectedIndex,
  onSelect,
}: {
  index: number;
  selectedIndex: number;
  onSelect: () => void;
}) {
  const isCenter = index === CENTER_INDEX;
  const distanceFromCenter = Math.abs(index - CENTER_INDEX); // 0..5
  const intensity = distanceFromCenter / 5;

  const filled = index < CENTER_INDEX ? index >= selectedIndex && index <= CENTER_INDEX
    : index > CENTER_INDEX ? index <= selectedIndex && index >= CENTER_INDEX
    : true; // the center dot itself always reads as "on" — it's the neutral baseline

  const isSelected = selectedIndex === index;
  const haloColor =
    intensity > 0.66 ? "rgba(220,38,38,0.55)" : intensity > 0.33 ? "rgba(245,158,11,0.5)" : "rgba(52,153,96,0.45)";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.85 }}
      aria-label={isCenter ? "Equally important" : `Preference strength ${distanceFromCenter} of 5`}
      className={`rounded-full border transition-colors ${
        isCenter ? "h-5 w-5 sm:h-6 sm:w-6" : "h-4 w-4 sm:h-5 sm:w-5"
      } ${filled ? "border-transparent bg-brand-400" : "border-brand-700 bg-transparent"}`}
      style={isSelected ? { boxShadow: `0 0 0 4px ${haloColor}` } : undefined}
    />
  );
}

function FlameCard({ label, active, intensity }: { label: string; active: boolean; intensity: number }) {
  const particleCount = active ? Math.max(1, Math.round(intensity * 6)) : 0;
  const glowColor = intensity > 0.6 ? "rgba(249,115,22,0.55)" : "rgba(251,191,36,0.4)";

  return (
    <div
      className={`relative min-w-0 flex-1 rounded-xl border px-3 py-6 text-center text-sm font-medium transition-all duration-300 sm:px-4 sm:py-8 sm:text-base ${
        active ? "border-amber-400 bg-brand-900/30 text-amber-100" : "border-brand-800 bg-surface-800/40 text-brand-200"
      }`}
      style={active ? { boxShadow: `0 0 ${10 + intensity * 26}px ${3 + intensity * 7}px ${glowColor}` } : undefined}
    >
      <span className="break-words">{label}</span>

      {particleCount > 0 && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center gap-1">
          {Array.from({ length: particleCount }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 animate-flame-flicker"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}