-- User marks a day "closed" to lock in totals for streak / cumulative deficit

CREATE TABLE IF NOT EXISTS calories.diary_closures (
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, logged_date)
);

GRANT SELECT, INSERT, DELETE ON calories.diary_closures TO authenticated;

ALTER TABLE calories.diary_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "closures_select_own"
  ON calories.diary_closures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "closures_insert_own"
  ON calories.diary_closures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "closures_delete_own"
  ON calories.diary_closures FOR DELETE
  USING (auth.uid() = user_id);
