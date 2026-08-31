-- ============================================================
-- Setup file - run all in Supabase SQL Editor
-- Creates: customers + orders + homepage_sections + custom auth
-- ============================================================

-- ============ Helper: check if current user is a site admin ============
CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_admins
    WHERE user_id = auth.uid()
  );
$$;

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

-- Customers can read their own profile; admins can read all
DROP POLICY IF EXISTS "customer_select_own_or_admin" ON customers;
CREATE POLICY "customer_select_own_or_admin" ON customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_site_admin());

-- Customers can insert their own profile (signup)
DROP POLICY IF EXISTS "customer_insert_own" ON customers;
CREATE POLICY "customer_insert_own" ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Customers can update their own profile; admins can update all
DROP POLICY IF EXISTS "customer_update_own_or_admin" ON customers;
CREATE POLICY "customer_update_own_or_admin" ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_site_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_site_admin());

-- Only admins can delete customers
DROP POLICY IF EXISTS "customer_delete_admin_only" ON customers;
CREATE POLICY "customer_delete_admin_only" ON customers FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

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

-- Customers see their own orders; admins see all
DROP POLICY IF EXISTS "order_select_own_or_admin" ON orders;
CREATE POLICY "order_select_own_or_admin" ON orders FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Customers can create orders for themselves
DROP POLICY IF EXISTS "order_insert_own" ON orders;
CREATE POLICY "order_insert_own" ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Customers can update their own orders (e.g. cancel); admins can update all
DROP POLICY IF EXISTS "order_update_own_or_admin" ON orders;
CREATE POLICY "order_update_own_or_admin" ON orders FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

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

-- Everyone can read homepage sections (public content)
DROP POLICY IF EXISTS "homepage_sections_select_public" ON homepage_sections;
CREATE POLICY "homepage_sections_select_public" ON homepage_sections FOR SELECT
  TO anon, authenticated USING (true);

-- Only admins can modify homepage sections
DROP POLICY IF EXISTS "homepage_sections_insert_admin" ON homepage_sections;
CREATE POLICY "homepage_sections_insert_admin" ON homepage_sections FOR INSERT
  TO authenticated WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "homepage_sections_update_admin" ON homepage_sections;
CREATE POLICY "homepage_sections_update_admin" ON homepage_sections FOR UPDATE
  TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "homepage_sections_delete_admin" ON homepage_sections;
CREATE POLICY "homepage_sections_delete_admin" ON homepage_sections FOR DELETE
  TO authenticated USING (public.is_site_admin());

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

-- Customers see their own prescriptions; admins see all
DROP POLICY IF EXISTS "prescription_select_own_or_admin" ON prescriptions;
CREATE POLICY "prescription_select_own_or_admin" ON prescriptions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Customers can insert their own prescriptions
DROP POLICY IF EXISTS "prescription_insert_own" ON prescriptions;
CREATE POLICY "prescription_insert_own" ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Customers can update their own (e.g. cancel); admins can update all
DROP POLICY IF EXISTS "prescription_update_own_or_admin" ON prescriptions;
CREATE POLICY "prescription_update_own_or_admin" ON prescriptions FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Only admins can delete prescriptions
DROP POLICY IF EXISTS "prescription_delete_admin_only" ON prescriptions;
CREATE POLICY "prescription_delete_admin_only" ON prescriptions FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage: anyone can read prescription images (they are uploaded by customers)
DROP POLICY IF EXISTS "prescriptions_storage_read" ON storage.objects;
CREATE POLICY "prescriptions_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'prescriptions');

-- Only authenticated users can upload prescription images
DROP POLICY IF EXISTS "prescriptions_storage_upload" ON storage.objects;
CREATE POLICY "prescriptions_storage_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'prescriptions');

-- Only admins can delete prescription images
DROP POLICY IF EXISTS "prescriptions_storage_delete" ON storage.objects;
CREATE POLICY "prescriptions_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'prescriptions' AND public.is_site_admin());

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

-- Payment screenshots: anyone can read (admin needs to see them)
DROP POLICY IF EXISTS "payments_storage_read" ON storage.objects;
CREATE POLICY "payments_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'payments');

-- Only authenticated users can upload payment screenshots
DROP POLICY IF EXISTS "payments_storage_upload" ON storage.objects;
CREATE POLICY "payments_storage_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payments');

-- Only admins can delete payment screenshots
DROP POLICY IF EXISTS "payments_storage_delete" ON storage.objects;
CREATE POLICY "payments_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'payments' AND public.is_site_admin());

-- ============ 6) Pharmacy sections (manual home page tabs control) ============
CREATE TABLE IF NOT EXISTS pharmacy_sections (
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  section_key text NOT NULL CHECK (section_key IN ('highest_rated', 'most_popular', 'delivery', '24h')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (pharmacy_id, section_key)
);

ALTER TABLE pharmacy_sections ENABLE ROW LEVEL SECURITY;

-- Everyone can read pharmacy sections (public content)
DROP POLICY IF EXISTS "pharmacy_sections_select_public" ON pharmacy_sections;
CREATE POLICY "pharmacy_sections_select_public" ON pharmacy_sections FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can modify pharmacy sections
DROP POLICY IF EXISTS "pharmacy_sections_insert_admin" ON pharmacy_sections;
CREATE POLICY "pharmacy_sections_insert_admin" ON pharmacy_sections FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "pharmacy_sections_delete_admin" ON pharmacy_sections;
CREATE POLICY "pharmacy_sections_delete_admin" ON pharmacy_sections FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

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

-- Only authenticated users can upload images
DROP POLICY IF EXISTS "images_storage_upload" ON storage.objects;
CREATE POLICY "images_storage_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'images');

-- Only admins can delete images
DROP POLICY IF EXISTS "images_storage_delete" ON storage.objects;
CREATE POLICY "images_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'images' AND public.is_site_admin());

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

-- Everyone can read active coupons (needed for checkout validation)
DROP POLICY IF EXISTS "coupons_select_public" ON coupons;
CREATE POLICY "coupons_select_public" ON coupons FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can manage coupons
DROP POLICY IF EXISTS "coupons_insert_admin" ON coupons;
CREATE POLICY "coupons_insert_admin" ON coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "coupons_update_admin" ON coupons;
CREATE POLICY "coupons_update_admin" ON coupons FOR UPDATE
  TO authenticated
  USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());

DROP POLICY IF EXISTS "coupons_delete_admin" ON coupons;
CREATE POLICY "coupons_delete_admin" ON coupons FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- ============ 10) Newsletter subscribers ============
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Only admins can view subscribers
DROP POLICY IF EXISTS "newsletter_subscribers_select_admin" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_select_admin" ON newsletter_subscribers FOR SELECT
  TO authenticated
  USING (public.is_site_admin());

-- Anyone can subscribe (public form)
DROP POLICY IF EXISTS "newsletter_subscribers_insert_public" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_insert_public" ON newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can delete subscribers
DROP POLICY IF EXISTS "newsletter_subscribers_delete_admin" ON newsletter_subscribers;
CREATE POLICY "newsletter_subscribers_delete_admin" ON newsletter_subscribers FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

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

-- Customers see their own notifications; admins see all
DROP POLICY IF EXISTS "notifications_select_own_or_admin" ON notifications;
CREATE POLICY "notifications_select_own_or_admin" ON notifications FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Only admins (or server) can create notifications
DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;
CREATE POLICY "notifications_insert_admin" ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

-- Customers can mark their own as read; admins can update all
DROP POLICY IF EXISTS "notifications_update_own_or_admin" ON notifications;
CREATE POLICY "notifications_update_own_or_admin" ON notifications FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

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

-- Everyone can read reviews (public)
DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
CREATE POLICY "reviews_select_public" ON reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert reviews
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Only admins can delete reviews
DROP POLICY IF EXISTS "reviews_delete_admin" ON reviews;
CREATE POLICY "reviews_delete_admin" ON reviews FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- ============ 13) Order groups (unified multi-pharmacy cart) ============
-- تجميع عدة منتجات من صيدليات مختلفة في طلب/توصيلة واحدة
CREATE TABLE IF NOT EXISTS order_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  address text,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_method text,
  payment_number text,
  payment_screenshot_url text,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_groups ENABLE ROW LEVEL SECURITY;

-- Customers see their own order groups; admins see all
DROP POLICY IF EXISTS "order_groups_select_own_or_admin" ON order_groups;
CREATE POLICY "order_groups_select_own_or_admin" ON order_groups FOR SELECT
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Customers can create order groups for themselves
DROP POLICY IF EXISTS "order_groups_insert_own" ON order_groups;
CREATE POLICY "order_groups_insert_own" ON order_groups FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- Customers can update their own; admins can update all
DROP POLICY IF EXISTS "order_groups_update_own_or_admin" ON order_groups;
CREATE POLICY "order_groups_update_own_or_admin" ON order_groups FOR UPDATE
  TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  )
  WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR public.is_site_admin()
  );

-- ربط كل منتج بمجموعة الطلب
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_group_id uuid REFERENCES order_groups(id) ON DELETE SET NULL;

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
