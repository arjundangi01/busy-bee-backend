export const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

// Matches dayKey's UTC-calendar-day convention — use together, never mix with
// a local-timezone midnight (e.g. `setHours(0,0,0,0)`).
export const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
