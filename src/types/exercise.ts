export type ExerciseLog = {
  id: string;
  user_id: string;
  logged_date: string;
  name: string;
  active_kcal: number;
  created_at: string;
};

export type ExerciseLogInput = {
  name: string;
  active_kcal: number;
};
