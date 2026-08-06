-- ============================================================
-- Setup file - run all in Supabase SQL Editor
-- Creates: customers + orders + homepage_sections + custom auth
-- ============================================================

-- ============ 1) Customers table ============
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text UNIQUE,
  avatar_url text,
  password_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_public_insert" ON customers;
CREATE POLICY "customer_public_insert" ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "customer_public_select" ON customers;
CREATE POLICY "customer_public_select" ON customers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "customer_update_own" ON customers;
CREATE POLICY "customer_update_own" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "customer_delete_own" ON customers;
CREATE POLICY "customer_delete_own" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Public update policy (fixes avatar/phone not saving - the app uses custom auth, not Supabase Auth)
DROP POLICY IF EXISTS "customer_public_update" ON customers;
CREATE POLICY "customer_public_update" ON customers FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Public delete policy (allows admin panel to delete any customer - the app uses custom auth)
DROP POLICY IF EXISTS "customer_public_delete" ON customers;
CREATE POLICY "customer_public_delete" ON customers FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============ 2) Orders table ============
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  address text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_public_select" ON orders;
CREATE POLICY "order_public_select" ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "order_public_insert" ON orders;
CREATE POLICY "order_public_insert" ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "order_public_update" ON orders;
CREATE POLICY "order_public_update" ON orders FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ============ 3) Homepage sections table ============
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
('nearest', 'الأقرب إليك', 'الصيدليات الأقرب إليك', 'الصيدليات', 'مرتبة حسب المسافة من موقعك', 'nearest', 1, 'primary', 'gray'),
  ('highest_rated', 'الأعلى تقييماً', 'أفضل الصيدليات تقييماً', NULL, 'صيدليات حصلت على أعلى تقييمات من عملائنا', 'highest_rated', 2, 'accent', 'white'),
  ('most_popular', 'الأكثر شعبية', 'أشهر الصيدليات', NULL, 'الصيدليات الأكثر طلباً من عملائنا', 'most_popular', 3, 'secondary', 'gray'),
  ('delivery', 'توصيل سريع', 'صيدليات التوصيل', NULL, 'اطلب دوائك واستلمه لباب البيت', 'delivery', 4, 'green', 'white'),
  ('is_24h', 'متاحة دائماً', 'صيدليات 24 ساعة', NULL, 'صيدليات تعمل على مدار الساعة', 'is_24h', 5, 'primary', 'gray')
) AS v(section_key, badge, title, title_alt, subtitle, section_type, sort_order, badge_color, bg_style)
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections LIMIT 1);

-- Update the nearest section title (in case it already exists)
UPDATE homepage_sections
SET title = 'الصيدليات الأقرب إليك'
WHERE section_key = 'nearest';

-- ============ 4) Prescriptions table + storage ============
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  phone text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'preparing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prescription_public_select" ON prescriptions;
CREATE POLICY "prescription_public_select" ON prescriptions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "prescription_public_insert" ON prescriptions;
CREATE POLICY "prescription_public_insert" ON prescriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "prescription_public_update" ON prescriptions;
CREATE POLICY "prescription_public_update" ON prescriptions FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "prescription_public_delete" ON prescriptions;
CREATE POLICY "prescription_public_delete" ON prescriptions FOR DELETE
  TO anon, authenticated
  USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "prescriptions_storage_read" ON storage.objects;
CREATE POLICY "prescriptions_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'prescriptions');

DROP POLICY IF EXISTS "prescriptions_storage_upload" ON storage.objects;
CREATE POLICY "prescriptions_storage_upload" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'prescriptions');

DROP POLICY IF EXISTS "prescriptions_storage_delete" ON storage.objects;
CREATE POLICY "prescriptions_storage_delete" ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'prescriptions');

-- ============ 5) Order payments (payment methods + screenshot + status) ============
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payments_storage_read" ON storage.objects;
CREATE POLICY "payments_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'payments');

DROP POLICY IF EXISTS "payments_storage_upload" ON storage.objects;
CREATE POLICY "payments_storage_upload" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payments');

DROP POLICY IF EXISTS "payments_storage_delete" ON storage.objects;
CREATE POLICY "payments_storage_delete" ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'payments');

-- ============ 6) Pharmacy sections (manual home page tabs control) ============
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

-- ============ 7) Generic images storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "images_storage_read" ON storage.objects;
CREATE POLICY "images_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "images_storage_upload" ON storage.objects;
CREATE POLICY "images_storage_upload" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "images_storage_delete" ON storage.objects;
CREATE POLICY "images_storage_delete" ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'images');

-- ============ 8) Products "available in all pharmacies" flag ============
ALTER TABLE products ADD COLUMN IF NOT EXISTS for_all_pharmacies boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_all_pharmacies ON products(for_all_pharmacies);

-- ============ 9) Coupons (discount codes) ============
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  value numeric(10,2) NOT NULL DEFAULT 0,
  min_order numeric(10,2) NOT NULL DEFAULT 0,
  max_discount numeric(10,2),
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_public_select" ON coupons;
CREATE POLICY "coupons_public_select" ON coupons FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "coupons_public_insert" ON coupons;
CREATE POLICY "coupons_public_insert" ON coupons FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "coupons_public_update" ON coupons;
CREATE POLICY "coupons_public_update" ON coupons FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "coupons_public_delete" ON coupons;
CREATE POLICY "coupons_public_delete" ON coupons FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============ 10) Newsletter subscribers ============
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_subscribers_public_select" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_public_select" ON newsletter_subscribers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "newsletter_subscribers_public_insert" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_public_insert" ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "newsletter_subscribers_public_delete" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_public_delete" ON newsletter_subscribers FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============ 11) Notifications (in-app alerts for customers) ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_public_select" ON notifications;
CREATE POLICY "notifications_public_select" ON notifications FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "notifications_public_insert" ON notifications;
CREATE POLICY "notifications_public_insert" ON notifications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_public_update" ON notifications;
CREATE POLICY "notifications_public_update" ON notifications FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Enable realtime for live delivery of notifications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============ 12) Pharmacy reviews ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_select" ON reviews;
CREATE POLICY "reviews_public_select" ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "reviews_public_insert" ON reviews;
CREATE POLICY "reviews_public_insert" ON reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "reviews_public_delete" ON reviews;
CREATE POLICY "reviews_public_delete" ON reviews FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
