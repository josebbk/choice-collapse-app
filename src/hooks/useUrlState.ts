// ─────────────────────────────────────────────────────────────────────────
// ChoiceCollapse — URL State Serialization
// Keeps the entire decision (options, criteria, wizard answers) local-first
// and shareable: the whole state lives compressed in the URL hash, so a
// link alone is enough to reconstruct and instantly show the Results phase.
// Requires: npm install lz-string
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { DecisionState } from "../types";
import { useDecisionStore } from "../store/useDecisionStore";

const HASH_PREFIX = "#d="; // "d" for "decision"

/** Serializes a DecisionState into a compact, URL-safe compressed string. */
export function encodeStateToHash(state: DecisionState): string {
  const json = JSON.stringify(state);
  return HASH_PREFIX + compressToEncodedURIComponent(json);
}

/** Attempts to reconstruct a DecisionState from the current window location hash. */
export function decodeStateFromHash(hash: string): DecisionState | null {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return null;
  try {
    const compressed = hash.slice(HASH_PREFIX.length);
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const parsed = JSON.parse(json) as DecisionState;
    if (parsed.version !== 1) return null; // guard against future breaking schema changes
    return parsed;
  } catch {
    return null; // malformed or tampered hash — fail closed, let the app start fresh
  }
}

/**
 * Bidirectional sync between the Zustand store and the URL hash.
 *   - On mount: if a hash is present, hydrate the store from it and jump to Results.
 *   - On every relevant state change thereafter: re-encode and push into the URL
 *     (replaceState, so it doesn't spam browser history on every keystroke).
 */
export function useUrlState() {
  const hydrateFromState = useDecisionStore((s) => s.hydrateFromState);
  const goToResults = useDecisionStore((s) => s.goToResults);
  const exportState = useDecisionStore((s) => s.exportState);

  // Store fields we want to react to — subscribing individually avoids
  // re-running the effect on every unrelated store update.
  const title = useDecisionStore((s) => s.title);
  const options = useDecisionStore((s) => s.options);
  const criteria = useDecisionStore((s) => s.criteria);
  const wizardAnswers = useDecisionStore((s) => s.wizardAnswers);
  const phase = useDecisionStore((s) => s.phase);

  const hasHydratedFromUrl = useRef(false);

  // ── Load once on mount ──
  useEffect(() => {
    const decoded = decodeStateFromHash(window.location.hash);
    if (decoded) {
      hydrateFromState(decoded);
      goToResults(); // "instantly render the Results phase"
    }
    hasHydratedFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Push to URL whenever the decision state meaningfully changes ──
  useEffect(() => {
    if (!hasHydratedFromUrl.current) return; // don't overwrite the incoming hash before we've read it
    if (options.length === 0 && criteria.length === 0) return; // nothing worth sharing yet

    const state = exportState();
    const newHash = encodeStateToHash(state);
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, options, criteria, wizardAnswers, phase]);
}

/** Convenience helper for a "Copy share link" button. */
export function getShareableUrl(state: DecisionState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${encodeStateToHash(state)}`;
}

/**
 * Strips any decision hash from the URL. Call this alongside store.reset()
 * (navbar title click, "Clean Start Over") — otherwise a reset in-app still
 * leaves the old encoded decision sitting in the address bar, ready to
 * silently reappear on the next page reload.
 */
export function clearShareHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}