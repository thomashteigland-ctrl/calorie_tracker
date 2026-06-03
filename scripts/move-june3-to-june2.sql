-- One-off: move diary entries from 2026-06-03 → 2026-06-02
-- Run in Supabase SQL editor: https://supabase.com/dashboard/project/dhkzbmrlgcxaxrwimzjs/sql/new
--
-- If you have multiple users, set your email on the SELECT below.

BEGIN;

DO $$
DECLARE
  uid uuid;
  from_date date := '2026-06-03';
  to_date date := '2026-06-02';
BEGIN
  SELECT id INTO uid
  FROM auth.users
  -- WHERE email = 'your@email.com'
  ORDER BY created_at
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user found';
  END IF;

  UPDATE calories.diary_meals
  SET logged_date = to_date
  WHERE user_id = uid AND logged_date = from_date;

  UPDATE calories.food_logs
  SET logged_date = to_date
  WHERE user_id = uid AND logged_date = from_date;

  UPDATE calories.exercise_logs
  SET logged_date = to_date
  WHERE user_id = uid AND logged_date = from_date;

  -- PK (user_id, logged_date): drop source row if target date already has data
  DELETE FROM calories.step_logs s
  WHERE s.user_id = uid AND s.logged_date = from_date
    AND EXISTS (
      SELECT 1 FROM calories.step_logs t
      WHERE t.user_id = uid AND t.logged_date = to_date
    );
  UPDATE calories.step_logs
  SET logged_date = to_date
  WHERE user_id = uid AND logged_date = from_date;

  DELETE FROM calories.weight_logs s
  WHERE s.user_id = uid AND s.logged_date = from_date
    AND EXISTS (
      SELECT 1 FROM calories.weight_logs t
      WHERE t.user_id = uid AND t.logged_date = to_date
    );
  UPDATE calories.weight_logs
  SET logged_date = to_date
  WHERE user_id = uid AND logged_date = from_date;

  DELETE FROM calories.diary_closures s
  WHERE s.user_id = uid AND s.logged_date = from_date
    AND EXISTS (
      SELECT 1 FROM calories.diary_closures t
      WHERE t.user_id = uid AND t.logged_date = to_date
    );
  UPDATE calories.diary_closures
  SET logged_date = to_date
  WHERE user_id = uid AND logged_date = from_date;
END $$;

COMMIT;
