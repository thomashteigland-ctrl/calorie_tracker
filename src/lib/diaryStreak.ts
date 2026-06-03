import { addDays } from "./dates";
import type { DailyCalorieSummary } from "../types/progress";

/** After this many consecutive unclosed calendar days, streak and chart reset (day 5+). */
export const MAX_CONSECUTIVE_UNCLOSED_BEFORE_RESET = 4;

export function countConsecutiveUnclosedDays(
  today: string,
  closedDates: Set<string>,
  lookbackStart: string,
): number {
  let count = 0;
  let cursor = today;
  while (cursor >= lookbackStart && !closedDates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function resolveStreakDisplay(
  today: string,
  streakDates: string[],
  streakDays: DailyCalorieSummary[],
  unclosedDates: string[],
  consecutiveUnclosedDays: number,
): {
  streakLength: number;
  streakDays: DailyCalorieSummary[];
  unclosedDates: string[];
  canShowCumulative: boolean;
  totalBalance: number;
} {
  if (consecutiveUnclosedDays > MAX_CONSECUTIVE_UNCLOSED_BEFORE_RESET) {
    return {
      streakLength: 0,
      streakDays: [],
      unclosedDates: [],
      canShowCumulative: false,
      totalBalance: 0,
    };
  }

  const totalBalance = streakDays.reduce((s, d) => s + d.balance, 0);

  let visibleUnclosed = unclosedDates;
  if (unclosedDates.length === 1 && unclosedDates[0] === today && streakDates.length > 0) {
    visibleUnclosed = [];
  }

  return {
    streakLength: streakDates.length,
    streakDays,
    unclosedDates: visibleUnclosed,
    canShowCumulative: streakDates.length > 0,
    totalBalance,
  };
}
