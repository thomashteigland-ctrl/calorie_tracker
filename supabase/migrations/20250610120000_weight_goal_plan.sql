-- Weight goal plan: target weight + timeline for back-calculated calorie goal

ALTER TABLE calories.user_goals
  ADD COLUMN IF NOT EXISTS target_weight_kg FLOAT,
  ADD COLUMN IF NOT EXISTS target_weeks INT;
