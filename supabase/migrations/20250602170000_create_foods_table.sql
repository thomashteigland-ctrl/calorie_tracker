-- Foods catalog in the calories schema (expose under API → Settings → Data API)
CREATE SCHEMA IF NOT EXISTS calories;

CREATE TABLE IF NOT EXISTS calories.foods (
  id TEXT PRIMARY KEY,
  name_no TEXT,
  name_en TEXT,
  source TEXT NOT NULL,
  locale TEXT NOT NULL,
  calories_per_100g FLOAT,
  protein_per_100g FLOAT,
  carbs_per_100g FLOAT,
  fat_per_100g FLOAT,
  raw_nutrients JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS foods_source_idx ON calories.foods (source);
CREATE INDEX IF NOT EXISTS foods_name_no_idx ON calories.foods (name_no);
CREATE INDEX IF NOT EXISTS foods_name_en_idx ON calories.foods (name_en);

-- API access for anon/authenticated clients (required for custom schemas)
GRANT USAGE ON SCHEMA calories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON calories.foods TO anon, authenticated, service_role;

ALTER TABLE calories.foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foods_select_public"
  ON calories.foods FOR SELECT
  USING (true);

CREATE POLICY "foods_insert_anon"
  ON calories.foods FOR INSERT
  WITH CHECK (true);

CREATE POLICY "foods_update_anon"
  ON calories.foods FOR UPDATE
  USING (true)
  WITH CHECK (true);
