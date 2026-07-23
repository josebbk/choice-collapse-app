// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — Phase 1: Setup
// User defines Options and Criteria. Toggling a criterion to an OBJECTIVE
// type reveals numeric inputs per option instead of relying on the wizard.
// Each added item shows a numbered index badge, and a live counter above
// the CTA tells the user exactly how many judgement calls remain.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useDecisionStore } from "../../store/useDecisionStore";
import { CriterionType } from "../../types";
import Button from "../common/Button";

export default function SetupPhase() {
  const {
    title, setTitle,
    options, addOption, removeOption,
    criteria, addCriterion, removeCriterion, setCriterionType, setObjectiveValue,
    goToWizard, getRequiredComparisonCount,
  } = useDecisionStore();

  const [newOptionName, setNewOptionName] = useState("");
  const [newCriterionName, setNewCriterionName] = useState("");

  const canProceed = options.length >= 2 && criteria.length >= 1;
  const matchupCount = getRequiredComparisonCount();

  return (
    <div className="mx-auto w-full max-w-screen-xl px-4 pb-16 pt-6 text-brand-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Editable decision title, styled as a headline rather than a plain form field */}
        <input
          className="w-full bg-transparent bg-gradient-to-r from-brand-200 via-brand-300 to-brand-400 bg-clip-text text-3xl font-extrabold text-transparent outline-none placeholder:bg-none placeholder:text-brand-500/50 sm:text-4xl"
          value="New Decision Matrix"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name this decision…"
        />
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-brand-300/80 sm:text-base">
          Welcome to Choice Collapse — an intelligent decision engine that eliminates overthinking by
          mathematically weighing what truly matters to you.
        </p>

        {/* ── Options ── */}
        <section className="mt-8 sm:mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-300">Options</h2>
          <ul className="mt-3 space-y-2">
            {options.map((o, i) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface-800/60 px-3 py-2 sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="truncate">{o.name}</span>
                </div>
                <button onClick={() => removeOption(o.id)} className="shrink-0 text-brand-500 hover:text-rose-400">
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newOptionName.trim()) return;
              addOption(newOptionName.trim());
              setNewOptionName("");
            }}
          >
            <input
              className="w-full flex-1 rounded-lg bg-surface-800 px-4 py-2 outline-none placeholder:text-brand-500/60"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              placeholder="e.g. Apartment A"
            />
            <Button type="submit" className="w-full sm:w-auto">Add</Button>
          </form>
        </section>

        {/* ── Criteria ── */}
        <section className="mt-8 sm:mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brand-300">Criteria</h2>
          <ul className="mt-3 space-y-3">
            {criteria.map((c, i) => (
              <li key={c.id} className="rounded-lg bg-surface-800/60 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="truncate font-medium">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/*
                      The trigger uses a solid (not translucent) surface color so it doesn't pick up
                      whatever's behind it. The <option> elements are styled explicitly too — most
                      browsers render native <option> popups with their own default (often light)
                      background regardless of the parent's Tailwind classes, so without this the
                      text was only legible once the OS's own hover-highlight color kicked in.
                    */}
                    <select
                      className="rounded-md border border-brand-700/40 bg-surface-800 px-2 py-1 text-sm text-brand-50"
                      value={c.type}
                      onChange={(e) => setCriterionType(c.id, e.target.value as CriterionType)}
                    >
                      <option
                        value={CriterionType.SUBJECTIVE}
                        className="bg-surface-900 text-brand-50"
                        style={{ backgroundColor: "#0c1712", color: "#f1faf3" }}
                      >
                        Subjective
                      </option>
                      <option
                        value={CriterionType.OBJECTIVE_HIGHER_IS_BETTER}
                        className="bg-surface-900 text-brand-50"
                        style={{ backgroundColor: "#0c1712", color: "#f1faf3" }}
                      >
                        Objective — higher is better
                      </option>
                      <option
                        value={CriterionType.OBJECTIVE_LOWER_IS_BETTER}
                        className="bg-surface-900 text-brand-50"
                        style={{ backgroundColor: "#0c1712", color: "#f1faf3" }}
                      >
                        Objective — lower is better
                      </option>
                    </select>
                    <button onClick={() => removeCriterion(c.id)} className="text-brand-500 hover:text-rose-400">✕</button>
                  </div>
                </div>

                {/* Numeric inputs appear only for objective criteria — this is what removes friction */}
                {c.type !== CriterionType.SUBJECTIVE && options.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {options.map((o) => (
                      <label key={o.id} className="flex flex-col text-xs text-brand-300">
                        {o.name}
                        <ObjectiveValueInput
                          value={o.objectiveValues[c.id]}
                          onChange={(v) => setObjectiveValue(o.id, c.id, v)}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCriterionName.trim()) return;
              addCriterion(newCriterionName.trim(), CriterionType.SUBJECTIVE);
              setNewCriterionName("");
            }}
          >
            <input
              className="w-full flex-1 rounded-lg bg-surface-800 px-4 py-2 outline-none placeholder:text-brand-500/60"
              value={newCriterionName}
              onChange={(e) => setNewCriterionName(e.target.value)}
              placeholder="e.g. Price, Commute time, Vibe"
            />
            <Button type="submit" className="w-full sm:w-auto">Add</Button>
          </form>
        </section>

        {/* ── Live matchup counter ── */}
        <p className="mt-8 text-center text-sm text-brand-300">
          The current number of choices that needs to be made:{" "}
          <span className="font-semibold text-brand-100">{matchupCount}</span>
        </p>

        <Button
          disabled={!canProceed}
          onClick={goToWizard}
          className="mt-3 w-full"
        >
          Start comparisons →
        </Button>
        {!canProceed && (
          <p className="mt-2 text-center text-xs text-brand-500">Add at least 2 options and 1 criterion.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Numeric input for objective criteria values (price, size, salary, etc).
 *   - Negative numbers are impossible: any "-" is stripped on every change event.
 *   - While focused, shows the raw digits so typing/editing feels normal.
 *   - On blur, reformats with thousands separators (e.g. 1,250,000) for legibility.
 * Uses type="text" (not type="number") because native number inputs cannot display
 * comma separators — the `min="0"` attribute is kept for semantics/accessibility,
 * with the actual non-negative enforcement done in the change handler below.
 */
function ObjectiveValueInput({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  // Sync the display text from the store whenever we're not actively being typed into.
  useEffect(() => {
    if (focused) return;
    setText(value !== undefined && !Number.isNaN(value) ? new Intl.NumberFormat("en-US").format(value) : "");
  }, [value, focused]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip negative signs outright — objective values are never allowed to go negative.
    const withoutNegatives = e.target.value.replace(/-/g, "");
    // Allow only digits, one decimal point, and commas while typing.
    const cleaned = withoutNegatives.replace(/[^0-9.,]/g, "");
    setText(cleaned);

    const numeric = parseFloat(cleaned.replace(/,/g, ""));
    onChange(Number.isNaN(numeric) ? 0 : Math.max(0, numeric));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      min="0"
      className="mt-1 rounded-md border border-brand-700/30 bg-surface-100/10 px-2 py-1.5 text-base font-semibold tabular-nums text-brand-50 outline-none focus:border-brand-400 sm:text-lg"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={handleChange}
      placeholder="0"
    />
  );
}