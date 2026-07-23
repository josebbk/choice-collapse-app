// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Phase 3: Results
// Rank cards fade from bold (1st place) to faint (last place), each option's
// overall share gets a big headline percentage and a proportional bar, and
// every criterion keeps one consistent badge color across every card.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDecisionStore } from "../../store/useDecisionStore";
import { getShareableUrl, clearShareHash } from "../../hooks/useUrlState";
import { buildCriterionColorMap } from "../../lib/colors";
import Button from "../common/Button";

export default function ResultsPhase() {
  const computeResults = useDecisionStore((s) => s.computeResults);
  const exportState = useDecisionStore((s) => s.exportState);
  const criteria = useDecisionStore((s) => s.criteria);
  const restartWithCurrentData = useDecisionStore((s) => s.restartWithCurrentData);
  const reset = useDecisionStore((s) => s.reset);

  const { scores, criteriaInconsistent, criterionCRs } = useMemo(computeResults, [computeResults]);
  const [copied, setCopied] = useState(false);

  const anyInconsistent = criteriaInconsistent || Object.values(criterionCRs).some((cr) => cr > 0.1);
  const colorMap = useMemo(() => buildCriterionColorMap(criteria.map((c) => c.id)), [criteria]);
  const totalScore = scores.reduce((sum, s) => sum + s.totalScore, 0) || 1;

  async function copyLink() {
    const url = getShareableUrl(exportState());
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 pb-16 pt-6 text-brand-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* CR warning — sits at the very top of the content area, directly under the fixed nav */}
        {anyInconsistent && (
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            ⚠ Some of your comparisons were logically inconsistent (Consistency Ratio &gt; 0.10). The ranking below is
            still mathematically valid, but consider revisiting the wizard for more reliable results.
          </div>
        )}

        <h2 className="text-2xl font-semibold">Results</h2>

        <motion.ul layout className="mt-6 space-y-4">
          {scores.map((score, rank) => {
            const intensity = scores.length > 1 ? 1 - rank / (scores.length - 1) : 1; // 1 = boldest (rank 0)
            const sharePct = (score.totalScore / totalScore) * 100;

            return (
              <motion.li
                layout
                key={score.optionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30, delay: rank * 0.05 }}
                className="rounded-2xl border p-4 sm:p-5"
                style={{
                  borderColor: `rgba(87,182,124,${0.15 + intensity * 0.55})`,
                  backgroundColor: `rgba(37,121,76,${0.06 + intensity * 0.34})`,
                }}
              >
                <div className="flex items-end justify-between gap-3">
                  <span className="truncate text-lg font-bold sm:text-xl">
                    {rank === 0 && "🏆 "}
                    {score.optionName}
                  </span>
                  <span className="shrink-0 text-2xl font-extrabold tabular-nums text-brand-100 sm:text-3xl">
                    {sharePct.toFixed(1)}%
                  </span>
                </div>

                {/* Proportional bar: full width == 100% of the combined total across all options */}
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-950/60">
                  <motion.div
                    className="h-full rounded-full bg-brand-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${sharePct}%` }}
                    transition={{ duration: 0.6, delay: 0.2 + rank * 0.05 }}
                  />
                </div>

                {/* Per-criterion contribution badges — color-consistent across every card */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {score.breakdown.map((b) => {
                    const color = colorMap[b.criterionId];
                    return (
                      <span
                        key={b.criterionId}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold ${color.bg} ${color.text}`}
                      >
                        {b.criterionName}: {(b.contribution * 100).toFixed(1)}%
                      </span>
                    );
                  })}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>

        {/* ── Share & Restart actions ── */}
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={copyLink}>{copied ? "Copied!" : "Copy Shareable Link"}</Button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={restartWithCurrentData} className="flex-1">
              Start Over with current data in place
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                clearShareHash();
              }}
              className="flex-1"
            >
              Clean Start Over
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}