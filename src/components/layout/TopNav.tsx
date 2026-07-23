// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Global Top Navigation
// Fixed bar with three zones: wordmark badge (left, now a full-reset button),
// live step name (center), domain badge (right).
// ─────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { DecisionState } from "../../types";
import { useDecisionStore } from "../../store/useDecisionStore";
import { clearShareHash } from "../../hooks/useUrlState";

const STEP_LABELS: Record<DecisionState["phase"], string> = {
  SETUP: "Setup",
  WIZARD: "Wizard",
  RESULTS: "Results",
};

export default function TopNav({ phase }: { phase: DecisionState["phase"] }) {
  const reset = useDecisionStore((s) => s.reset);

  function handleLogoClick() {
    reset();
    clearShareHash();
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-brand-900/40 bg-surface-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: wordmark badge — clicking it fully resets the app and clears the share hash */}
        <motion.button
          type="button"
          onClick={handleLogoClick}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2"
          aria-label="Reset ChoiceCollapse and start a new decision"
          title="Start a brand-new decision"
        >
          <span className="rounded-md bg-badge px-2.5 py-1 text-sm font-extrabold tracking-tight text-badge-fg sm:text-base">
            Choice Collapse
          </span>
        </motion.button>

        {/* Center: current step, hidden on the smallest screens to avoid crowding */}
        <div className="hidden flex-1 justify-center sm:flex">
          <span className="rounded-full border border-brand-700/40 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-brand-200">
            {STEP_LABELS[phase]}
          </span>
        </div>

        {/* Right: domain badge with distinct color treatment per segment */}
        <div className="flex items-center text-sm font-semibold sm:text-base">
          <span className="text-brand-100">josebbk</span>
          <span className="text-amber-400">.</span>
          <span className="text-brand-400">com</span>
        </div>
      </div>

      {/* Step label repeated on mobile, beneath the main row, so it's never lost */}
      <div className="flex justify-center border-t border-brand-900/30 py-1 sm:hidden">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-brand-300">
          {STEP_LABELS[phase]}
        </span>
      </div>
    </header>
  );
}