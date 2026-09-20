-- Homepage sections table
CREATE TABLE IF NOT EXISTS homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  badge text NOT NULL,
  title text NOT NULL,
  title_alt text,
  subtitle text,
  section_type text NOT NULL CHECK (section_type IN (
    'nearest', 'highest_rated', 'most_popular', 'delivery', 'is_24h', 'insurance', 'parking'
  )),
  is_active boolean DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  badge_color text DEFAULT 'primary',
  bg_style text DEFAULT 'gray' CHECK (bg_style IN ('gray', 'white')),
  item_limit integer DEFAULT 6,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homepage_sections_public_select" ON homepage_sections;
CREATE POLICY "homepage_sections_public_select" ON homepage_sections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "homepage_sections_public_insert" ON homepage_sections;
CREATE POLICY "homepage_sections_public_insert" ON homepage_sections FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "homepage_sections_public_update" ON homepage_sections;
CREATE POLICY "homepage_sections_public_update" ON homepage_sections FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "homepage_sections_public_delete" ON homepage_sections;
CREATE POLICY "homepage_sections_public_delete" ON homepage_sections FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO homepage_sections (section_key, badge, title, title_alt, subtitle, section_type, sort_order, badge_color, bg_style)
SELECT * FROM (VALUES
  ('nearest', 'الأقرب إليك', 'أقرب الصيدليات إليك', 'الصيدليات', 'مرتبة حسب المسافة من موقعك', 'nearest', 1, 'primary', 'gray'),
  ('highest_rated', 'الأعلى تقييماً', 'أفضل الصيدليات تقييماً', NULL, 'صيدليات حصلت على أعلى تقييمات من عملائنا', 'highest_rated', 2, 'accent', 'white'),
  ('most_popular', 'الأكثر شعبية', 'أشهر الصيدليات', NULL, 'الصيدليات الأكثر طلباً من عملائنا', 'most_popular', 3, 'secondary', 'gray'),
  ('delivery', 'توصيل سريع', 'صيدليات التوصيل', NULL, 'اطلب دوائك واستلمه لباب البيت', 'delivery', 4, 'green', 'white'),
  ('is_24h', 'متاحة دائماً', 'صيدليات 24 ساعة', NULL, 'صيدليات تعمل على مدار الساعة', 'is_24h', 5, 'primary', 'gray')
) AS v(section_key, badge, title, title_alt, subtitle, section_type, sort_order, badge_color, bg_style)
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections LIMIT 1);
