-- Group food logs into named meals (Meal 1, Meal 2, …)

CREATE TABLE IF NOT EXISTS calories.diary_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE calories.food_logs
  ADD COLUMN IF NOT EXISTS meal_id UUID REFERENCES calories.diary_meals (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS diary_meals_user_date_idx
  ON calories.diary_meals (user_id, logged_date, sort_order);

CREATE INDEX IF NOT EXISTS food_logs_meal_id_idx ON calories.food_logs (meal_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON calories.diary_meals TO authenticated;

ALTER TABLE calories.diary_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meals_select_own"
  ON calories.diary_meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "meals_insert_own"
  ON calories.diary_meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meals_update_own"
  ON calories.diary_meals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meals_delete_own"
  ON calories.diary_meals FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "logs_update_own"
  ON calories.food_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
