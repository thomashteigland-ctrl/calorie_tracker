-- Upsert / updates on diary_closures (close diary previously used upsert without UPDATE access)

GRANT UPDATE ON calories.diary_closures TO authenticated;

CREATE POLICY "closures_update_own"
  ON calories.diary_closures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
