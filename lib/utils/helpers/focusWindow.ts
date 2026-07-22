export type IFocusWindow = { startHour: number; endHour: number };

// Shared by dashboard's pattern-signal line and progress's "Best focus window"
// row — both need the same hour-of-day-with-most-focused-minutes computation.
export const computeBestFocusWindow = (
  sessions: { startedAt: Date; elapsedSeconds: number | null }[],
): IFocusWindow | null => {
  if (sessions.length === 0) {
    return null;
  }

  const minutesByHour = new Map<number, number>();
  for (const session of sessions) {
    const hour = session.startedAt.getHours();
    minutesByHour.set(hour, (minutesByHour.get(hour) ?? 0) + (session.elapsedSeconds ?? 0) / 60);
  }

  const [bestHour] = [...minutesByHour.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null];
  if (bestHour === null) {
    return null;
  }

  return { startHour: bestHour, endHour: (bestHour + 1) % 24 };
};

export const formatHour = (hour: number): string => {
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}${period}`;
};
