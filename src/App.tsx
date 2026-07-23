// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — App shell
// Local-first: no backend, no database. The Zustand store is the single
// source of truth, and useUrlState keeps it mirrored into the URL hash
// for instant, serverless sharing. TopNav is fixed; content pads below it.
// ─────────────────────────────────────────────────────────────────────────

import { useDecisionStore } from "./store/useDecisionStore";
import { useUrlState } from "./hooks/useUrlState";
import TopNav from "./components/layout/TopNav";
import SetupPhase from "./components/phase1/SetupPhase";
import WizardPhase from "./components/phase2/WizardPhase";
import ResultsPhase from "./components/phase3/ResultsPhase";

export default function App() {
  useUrlState();
  const phase = useDecisionStore((s) => s.phase);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-surface-950">
      <TopNav phase={phase} />
      {/* pt-20/24 clears the fixed nav (taller on mobile, where the step label wraps to a second row) */}
      <main className="pt-24 sm:pt-20">
        {phase === "SETUP" && <SetupPhase />}
        {phase === "WIZARD" && <WizardPhase />}
        {phase === "RESULTS" && <ResultsPhase />}
      </main>
    </div>
  );
}
