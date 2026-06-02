-- Body stats and activity for BMR / TDEE (net-zero calorie balance)

ALTER TABLE calories.profiles
  ADD COLUMN IF NOT EXISTS height_cm FLOAT CHECK (height_cm IS NULL OR height_cm > 0),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS activity_level TEXT NOT NULL DEFAULT 'moderate'
    CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active'));
