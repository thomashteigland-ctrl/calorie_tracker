import type { FoodLogWithFood } from "../types/foodLog";
import type { MealWithLogs } from "../types/meal";

export const UNGROUPED_MEAL_ID = "__ungrouped__";

/** Group diary logs by meal for display. */
export function groupLogsIntoMeals(logs: FoodLogWithFood[]): MealWithLogs[] {
  const byMeal = new Map<string, MealWithLogs>();

  for (const log of logs) {
    if (!log.meal_id || !log.meal) {
      if (!byMeal.has(UNGROUPED_MEAL_ID)) {
        byMeal.set(UNGROUPED_MEAL_ID, {
          id: UNGROUPED_MEAL_ID,
          name: "Other",
          sort_order: 9999,
          logs: [],
        });
      }
      byMeal.get(UNGROUPED_MEAL_ID)!.logs.push(log);
      continue;
    }

    if (!byMeal.has(log.meal_id)) {
      byMeal.set(log.meal_id, {
        id: log.meal_id,
        name: log.meal.name,
        sort_order: log.meal.sort_order,
        logs: [],
      });
    }
    byMeal.get(log.meal_id)!.logs.push(log);
  }

  return [...byMeal.values()]
    .map((meal) => ({
      ...meal,
      logs: [...meal.logs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}
