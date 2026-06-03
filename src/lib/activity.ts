/** Convert logged steps to activity kcal (weight-adjusted, ~70 kg reference). */
export function activityKcalFromSteps(steps: number, weightKg: number): number {
  if (!(steps > 0) || !(weightKg > 0)) return 0;
  return steps * 0.04 * (weightKg / 70);
}
