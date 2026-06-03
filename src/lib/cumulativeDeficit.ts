import type { DailyCalorieSummary } from "../types/progress";
import { addDays } from "./dates";
import type { WeightGoalDirection } from "./weightGoal";

export type CumulativeDeficitPoint = {
  logged_date: string;
  dateLabel: string;
  targetCumulative: number;
  actualCumulative: number;
  onTrack: boolean;
  /** Day before first closed day — both lines start at 0 here. */
  isBaseline?: boolean;
};

/** Whether cumulative actual deficit/surplus is on pace vs the weight-goal plan. */
export function isCumulativeOnTrack(
  actualCumulative: number,
  targetCumulative: number,
  direction: WeightGoalDirection,
): boolean {
  const tolerance = 75;
  if (direction === "lose") {
    return actualCumulative <= targetCumulative + tolerance;
  }
  if (direction === "gain") {
    return actualCumulative >= targetCumulative - tolerance;
  }
  return Math.abs(actualCumulative - targetCumulative) <= 150;
}

/**
 * Cumulative target vs actual for closed streak days.
 * Always prefixes T−1 (day before first close) at 0 so the chart starts at zero.
 */
export function buildCumulativeDeficitSeries(
  streakDays: DailyCalorieSummary[],
  maintenanceKcal: number,
  dailyAdjustment: number,
  direction: WeightGoalDirection,
): CumulativeDeficitPoint[] {
  if (streakDays.length === 0) return [];

  const baselineDate = addDays(streakDays[0].logged_date, -1);
  const points: CumulativeDeficitPoint[] = [
    {
      logged_date: baselineDate,
      dateLabel: baselineDate.slice(5),
      targetCumulative: 0,
      actualCumulative: 0,
      onTrack: true,
      isBaseline: true,
    },
  ];

  let targetSum = 0;
  let actualSum = 0;

  for (const day of streakDays) {
    targetSum += dailyAdjustment;
    actualSum += day.consumed - maintenanceKcal;

    points.push({
      logged_date: day.logged_date,
      dateLabel: day.logged_date.slice(5),
      targetCumulative: Math.round(targetSum),
      actualCumulative: Math.round(actualSum),
      onTrack: isCumulativeOnTrack(actualSum, targetSum, direction),
    });
  }

  return points;
}
