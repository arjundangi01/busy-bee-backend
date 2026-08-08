// design-artifacts/evolution/specs/14-session-timeline.md — the "distraction
// timing" signal for the Session Timeline screen: not raw minutes-to-first-
// block (doesn't compare fairly across sessions of different lengths — 9min
// into a 25min session and 2h30m into a 3hr session are very different
// outcomes), but the % of THIS session elapsed before the first
// BlockedAttemptEvent, compared against the user's own rolling 8-week
// baseline of the same metric.
export type ISessionDistractionTimingTier = "clean" | "building" | "earlier" | "typical" | "later" | "heldLong";

export const MIN_BASELINE_SESSIONS = 3;
const HELD_LONG_THRESHOLD_PERCENT = 85;
const TYPICAL_BAND_POINTS = 15;

// Clamped [0, 100] — a block technically at/after endedAt (shouldn't happen,
// but a clock skew or a block recorded a beat after `end()` ran is possible)
// is treated as the very end of the session rather than producing >100%.
export const computeElapsedPercent = (sessionStartedAt: Date, sessionEndedAt: Date, occurredAt: Date): number => {
  const totalMs = sessionEndedAt.getTime() - sessionStartedAt.getTime();
  if (totalMs <= 0) return 0;
  const elapsedMs = occurredAt.getTime() - sessionStartedAt.getTime();
  return Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100));
};

// Standard median — even-length arrays average the two middle values. Chosen
// over a mean since a single unusually early/late session shouldn't swing
// "your usual" as much as a run of typical ones.
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

export type IDistractionTimingBaseline = {
  baselineElapsedPercent: number | null;
  hasEnoughData: boolean;
};

// qualifyingElapsedPercents: firstBlockElapsedPercent for every one of the
// user's own ended, blockedAttemptCount>0 sessions in the trailing 8-week
// window (caller does the windowing/filtering — this is pure aggregation).
export const computeDistractionTimingBaseline = (qualifyingElapsedPercents: number[]): IDistractionTimingBaseline => {
  if (qualifyingElapsedPercents.length < MIN_BASELINE_SESSIONS) {
    return { baselineElapsedPercent: null, hasEnoughData: false };
  }
  return { baselineElapsedPercent: median(qualifyingElapsedPercents), hasEnoughData: true };
};

export type IDistractionTiming = {
  tier: ISessionDistractionTimingTier;
  firstBlockElapsedSeconds: number | null;
  firstBlockElapsedPercent: number | null;
  baselineElapsedPercent: number | null;
};

// blockedAttemptCount/firstBlock describe THIS session; baseline describes
// the user's own rolling history (already computed by
// computeDistractionTimingBaseline). Precedence matters: heldLong is checked
// before the earlier/later band comparison so a distraction very close to
// the finish line always reads as "held focus," never merely "later than
// usual" — regardless of where the baseline happens to sit.
export const classifyDistractionTiming = (
  blockedAttemptCount: number,
  firstBlockElapsedSeconds: number | null,
  firstBlockElapsedPercent: number | null,
  baseline: IDistractionTimingBaseline,
): IDistractionTiming => {
  const base = { firstBlockElapsedSeconds, firstBlockElapsedPercent, baselineElapsedPercent: baseline.baselineElapsedPercent };

  if (blockedAttemptCount === 0 || firstBlockElapsedPercent === null) {
    return { ...base, tier: "clean" };
  }
  if (!baseline.hasEnoughData || baseline.baselineElapsedPercent === null) {
    return { ...base, tier: "building" };
  }
  if (firstBlockElapsedPercent >= HELD_LONG_THRESHOLD_PERCENT) {
    return { ...base, tier: "heldLong" };
  }
  if (firstBlockElapsedPercent < baseline.baselineElapsedPercent - TYPICAL_BAND_POINTS) {
    return { ...base, tier: "earlier" };
  }
  if (firstBlockElapsedPercent > baseline.baselineElapsedPercent + TYPICAL_BAND_POINTS) {
    return { ...base, tier: "later" };
  }
  return { ...base, tier: "typical" };
};
