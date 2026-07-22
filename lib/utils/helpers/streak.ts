import { dayKey } from "@/utils/helpers/date";

// A "hit" day is one where at least one Mission completed — the same
// zero-backlog definition used by the dashboard's streak stat, the 7-day
// trend, and the 30-day progress calendar. Keeping one calculation shared
// avoids the three surfaces ever disagreeing on what counts as a hit.
export const calculateCurrentStreakDays = (hitDayKeys: Set<string>): number => {
  let streak = 0;
  const cursor = new Date();

  for (;;) {
    if (!hitDayKeys.has(dayKey(cursor))) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

// All-time longest consecutive run, bounded by account creation — days
// before the account existed can never contribute to (or break) a streak.
export const calculateBestStreakDays = (hitDayKeys: Set<string>, accountCreatedAt: Date): number => {
  let bestStreak = 0;
  let currentStreak = 0;
  const cursor = new Date(accountCreatedAt);
  const today = new Date();

  while (dayKey(cursor) <= dayKey(today)) {
    if (hitDayKeys.has(dayKey(cursor))) {
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return bestStreak;
};
