import type { Food } from "./food";

export type RecentFood = Food & {
  last_portions: number;
  last_logged_at: string;
};
