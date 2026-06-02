-- User profiles, daily goals, and food logs (100 g portions)

CREATE TABLE IF NOT EXISTS calories.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calories.user_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  daily_calories FLOAT NOT NULL DEFAULT 2000,
  daily_protein_g FLOAT NOT NULL DEFAULT 150,
  daily_carbs_g FLOAT NOT NULL DEFAULT 200,
  daily_fat_g FLOAT NOT NULL DEFAULT 65,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calories.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  food_id TEXT NOT NULL REFERENCES calories.foods (id) ON DELETE RESTRICT,
  logged_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  portions FLOAT NOT NULL CHECK (portions > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_logs_user_date_idx ON calories.food_logs (user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS food_logs_food_id_idx ON calories.food_logs (food_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON calories.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calories.user_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calories.food_logs TO authenticated;

ALTER TABLE calories.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calories.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calories.food_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_own"
  ON calories.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON calories.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON calories.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Goals
CREATE POLICY "goals_select_own"
  ON calories.user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own"
  ON calories.user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own"
  ON calories.user_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Food logs
CREATE POLICY "logs_select_own"
  ON calories.food_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "logs_insert_own"
  ON calories.food_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "logs_delete_own"
  ON calories.food_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Create profile row when a user signs up
CREATE OR REPLACE FUNCTION calories.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = calories
AS $$
BEGIN
  INSERT INTO calories.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION calories.handle_new_user();
