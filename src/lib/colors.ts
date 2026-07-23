// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Criterion Color Assignment
// Every criterion gets one color, assigned once by its position in the
// criteria list, so "Beauty" is the same badge color on every option card.
// ─────────────────────────────────────────────────────────────────────────

export interface CriterionColor {
  bg: string; // solid badge background
  text: string; // text on the badge
  dot: string; // small legend dot / bar segment
}

// A palette chosen to sit comfortably alongside the app's green design system
// without being confused for it — each entry is visually distinct at a glance.
const PALETTE: CriterionColor[] = [
  { bg: "bg-amber-500", text: "text-amber-950", dot: "bg-amber-500" },
  { bg: "bg-sky-500", text: "text-sky-950", dot: "bg-sky-500" },
  { bg: "bg-rose-500", text: "text-rose-950", dot: "bg-rose-500" },
  { bg: "bg-violet-500", text: "text-violet-950", dot: "bg-violet-500" },
  { bg: "bg-lime-500", text: "text-lime-950", dot: "bg-lime-500" },
  { bg: "bg-fuchsia-500", text: "text-fuchsia-950", dot: "bg-fuchsia-500" },
  { bg: "bg-cyan-500", text: "text-cyan-950", dot: "bg-cyan-500" },
  { bg: "bg-orange-500", text: "text-orange-950", dot: "bg-orange-500" },
];

/**
 * Returns a stable color for a criterion given its index in the (stably-ordered)
 * criteria array. Using positional index rather than hashing the id keeps colors
 * assigned in a predictable left-to-right order as criteria are added.
 */
export function colorForCriterionIndex(index: number): CriterionColor {
  return PALETTE[index % PALETTE.length];
}

/** Convenience: build an id → color lookup for a full criteria list. */
export function buildCriterionColorMap(criteriaIds: string[]): Record<string, CriterionColor> {
  const map: Record<string, CriterionColor> = {};
  criteriaIds.forEach((id, i) => {
    map[id] = colorForCriterionIndex(i);
  });
  return map;
}
