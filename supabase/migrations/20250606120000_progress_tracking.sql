-- Weight and steps for Progress tab (steps optional / manual for now)

CREATE TABLE IF NOT EXISTS calories.weight_logs (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  weight_kg FLOAT NOT NULL CHECK (weight_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, logged_date)
);

CREATE TABLE IF NOT EXISTS calories.step_logs (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  steps INTEGER NOT NULL CHECK (steps >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, logged_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON calories.weight_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calories.step_logs TO authenticated;

ALTER TABLE calories.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE calories.step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weight_select_own" ON calories.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_insert_own" ON calories.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_update_own" ON calories.weight_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_delete_own" ON calories.weight_logs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "steps_select_own" ON calories.step_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "steps_insert_own" ON calories.step_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "steps_update_own" ON calories.step_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "steps_delete_own" ON calories.step_logs FOR DELETE USING (auth.uid() = user_id);
