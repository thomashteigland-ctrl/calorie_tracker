-- Manual exercise logs (type + active kcal) for diary activity

CREATE TABLE IF NOT EXISTS calories.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  name TEXT NOT NULL,
  active_kcal FLOAT NOT NULL CHECK (active_kcal > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercise_logs_user_date_idx
  ON calories.exercise_logs (user_id, logged_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON calories.exercise_logs TO authenticated;

ALTER TABLE calories.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_select_own"
  ON calories.exercise_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "exercise_insert_own"
  ON calories.exercise_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exercise_update_own"
  ON calories.exercise_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exercise_delete_own"
  ON calories.exercise_logs FOR DELETE
  USING (auth.uid() = user_id);
