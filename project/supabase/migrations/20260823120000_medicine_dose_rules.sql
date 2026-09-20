-- Medicine dose rules for the pediatric dose calculator.
-- Rows added here appear automatically in the calculator; entries sharing
-- a `key` with a built-in default override it.

CREATE TABLE IF NOT EXISTS medicine_dose_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  basis text NOT NULL DEFAULT 'perDose' CHECK (basis IN ('perDose', 'perDay')),
  low double precision NOT NULL CHECK (low >= 0),
  high double precision NOT NULL CHECK (high >= low),
  per_day integer NOT NULL DEFAULT 1 CHECK (per_day BETWEEN 1 AND 6),
  interval_h integer NOT NULL DEFAULT 24 CHECK (interval_h BETWEEN 1 AND 24),
  min_age_months integer NOT NULL DEFAULT 0 CHECK (min_age_months >= 0),
  max_daily_mg_per_kg double precision,
  max_single_mg double precision,
  note text,
  forms jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medicine_dose_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dose_rules" ON medicine_dose_rules;
CREATE POLICY "anon_select_dose_rules" ON medicine_dose_rules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "anon_insert_dose_rules" ON medicine_dose_rules;
CREATE POLICY "anon_insert_dose_rules" ON medicine_dose_rules FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_dose_rules" ON medicine_dose_rules;
CREATE POLICY "anon_update_dose_rules" ON medicine_dose_rules FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_dose_rules" ON medicine_dose_rules;
CREATE POLICY "anon_delete_dose_rules" ON medicine_dose_rules FOR DELETE
  USING (true);
