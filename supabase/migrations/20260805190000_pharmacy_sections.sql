-- ============================================================
-- Pharmacy sections: manual admin control of home page tabs
-- (highest_rated, most_popular, delivery, 24h)
-- ============================================================

CREATE TABLE IF NOT EXISTS pharmacy_sections (
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  section_key text NOT NULL CHECK (section_key IN ('highest_rated', 'most_popular', 'delivery', '24h')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (pharmacy_id, section_key)
);

ALTER TABLE pharmacy_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pharmacy_sections_public_select" ON pharmacy_sections;
CREATE POLICY "pharmacy_sections_public_select" ON pharmacy_sections FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "pharmacy_sections_public_insert" ON pharmacy_sections;
CREATE POLICY "pharmacy_sections_public_insert" ON pharmacy_sections FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "pharmacy_sections_public_delete" ON pharmacy_sections;
CREATE POLICY "pharmacy_sections_public_delete" ON pharmacy_sections FOR DELETE
  TO anon, authenticated
  USING (true);

-- Seed from current pharmacy flags so nothing breaks after migration
INSERT INTO pharmacy_sections (pharmacy_id, section_key)
SELECT id, 'highest_rated' FROM pharmacies
ON CONFLICT (pharmacy_id, section_key) DO NOTHING;

INSERT INTO pharmacy_sections (pharmacy_id, section_key)
SELECT id, 'most_popular' FROM pharmacies
ON CONFLICT (pharmacy_id, section_key) DO NOTHING;

INSERT INTO pharmacy_sections (pharmacy_id, section_key)
SELECT id, 'delivery' FROM pharmacies WHERE delivery_available = true
ON CONFLICT (pharmacy_id, section_key) DO NOTHING;

INSERT INTO pharmacy_sections (pharmacy_id, section_key)
SELECT id, '24h' FROM pharmacies WHERE is_24h = true
ON CONFLICT (pharmacy_id, section_key) DO NOTHING;
