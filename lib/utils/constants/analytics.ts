// No per-blocked-app tracking exists yet (the blocking mechanism itself is a
// later delivery) — approximate reclaimed time from blocked-attempt counts
// using a fixed per-attempt estimate rather than fabricating precision we don't have.
export const ASSUMED_MINUTES_PER_BLOCKED_ATTEMPT = 3;
