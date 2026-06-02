-- Barcode scanning: link products to EAN/UPC and track who added custom items

ALTER TABLE calories.foods
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS foods_barcode_unique_idx
  ON calories.foods (barcode)
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS foods_barcode_lookup_idx ON calories.foods (barcode);

-- Logged-in users can add foods from barcode scan or manual entry
CREATE POLICY "foods_insert_authenticated"
  ON calories.foods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND source IN ('openfoodfacts', 'user')
  );

CREATE POLICY "foods_update_own"
  ON calories.foods
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
