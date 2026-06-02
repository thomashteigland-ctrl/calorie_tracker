export type WeightLog = {
  user_id: string;
  logged_date: string;
  weight_kg: number;
  created_at: string;
};

export type DailyCalorieSummary = {
  logged_date: string;
  consumed: number;
  goal: number;
  balance: number;
};

export type CumulativeProgress = {
  days: DailyCalorieSummary[];
  totalBalance: number;
};

export type DiaryStreakStats = {
  streakDays: DailyCalorieSummary[];
  streakLength: number;
  totalBalance: number;
  unclosedDates: string[];
  canShowCumulative: boolean;
};
