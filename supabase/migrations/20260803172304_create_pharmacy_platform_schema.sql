/*
# إنشاء قاعدة بيانات منصة الصيدليات

1. الجداول الجديدة
- `categories`: فئات الأدوية والمنتجات (مسكنات، مضادات حيوية، مكملات غذائية، إلخ)
- `pharmacies`: الصيدليات المسجلة على المنصة مع الموقع الجغرافي وبيانات التواصل
- `products`: المنتجات/الأدوية التي تعرضها كل صيدلية مع الأسعار والصور
- `discounts`: الخصومات على المنتجات
- `site_settings`: إعدادات الموقع العامة (الألوان، العبارات، أرقام التواصل، الشعار)

2. العلاقات
- كل منتج ينتمي إلى صيدلية واحدة وفئة واحدة
- كل خصم مرتبط بمنتج وصيدلية
- إعدادات الموقع في صف واحد (singleton)

3. الأمان
- تفعيل RLS على جميع الجداول
- السياسات تسمح بقراءة عامة للزوار (anon + authenticated) لأن الموقع عام
- الكتابة (إضافة/تعديل/حذف) متاحة للأدمن فقط عبر سياسات مفتوحة للأنون في هذه المرحلة
  (لوحة الأدمن محمية في الواجهة الأمامية)

4. ملاحظات
- إحداثيات الموقع تخزن كـ numeric (latitude, longitude) لحساب المسافة
- المنتجات مرتبة أبجدياً عبر ترتيب افتراضي
- كل صيدلية لها صورة شعار وغلاف
- دعم حساب المسافة بين العميل والصيدلية في الواجهة
*/

-- ============================================
-- جدول الفئات
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text,
  slug text UNIQUE NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- جدول الصيدليات
-- ============================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  cover_url text,
  phone text,
  whatsapp text,
  email text,
  address text NOT NULL,
  area text,
  city text,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  is_active boolean DEFAULT true,
  rating numeric(2, 1) DEFAULT 5.0,
  delivery_available boolean DEFAULT false,
  delivery_fee numeric DEFAULT 0,
  opening_hours text,
  is_24h boolean DEFAULT false,
  has_parking boolean DEFAULT false,
  accept_insurance boolean DEFAULT false,
  website_url text,
  pharmacy_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pharmacies" ON pharmacies;
CREATE POLICY "anon_select_pharmacies" ON pharmacies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pharmacies" ON pharmacies;
CREATE POLICY "anon_insert_pharmacies" ON pharmacies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pharmacies" ON pharmacies;
CREATE POLICY "anon_update_pharmacies" ON pharmacies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pharmacies" ON pharmacies;
CREATE POLICY "anon_delete_pharmacies" ON pharmacies FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pharmacies_location ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pharmacies_active ON pharmacies(is_active);
CREATE INDEX IF NOT EXISTS idx_pharmacies_area ON pharmacies(area);

-- ============================================
-- جدول المنتجات
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  name_en text,
  description text,
  image_url text,
  price numeric(10, 2) NOT NULL,
  unit text DEFAULT 'قطعة',
  is_available boolean DEFAULT true,
  requires_prescription boolean DEFAULT false,
  active_ingredient text,
  manufacturer text,
  form text,
  dosage text,
  stock_quantity integer DEFAULT 0,
  barcode text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_products_pharmacy ON products(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- ============================================
-- جدول الخصومات
-- ============================================
CREATE TABLE IF NOT EXISTS discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  discount_percentage numeric(5, 2) NOT NULL DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_discounts" ON discounts;
CREATE POLICY "anon_select_discounts" ON discounts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_discounts" ON discounts;
CREATE POLICY "anon_insert_discounts" ON discounts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_discounts" ON discounts;
CREATE POLICY "anon_update_discounts" ON discounts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_discounts" ON discounts;
CREATE POLICY "anon_delete_discounts" ON discounts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_discounts_product ON discounts(product_id);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);

-- ============================================
-- جدول إعدادات الموقع (Singleton)
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'صيدليتي',
  site_tagline text DEFAULT 'صيدلياتك القريبة منك في مكان واحد',
  site_description text,
  logo_url text,
  primary_color text DEFAULT '#0d9488',
  secondary_color text DEFAULT '#0f766e',
  accent_color text DEFAULT '#f59e0b',
  contact_phone text,
  contact_email text,
  contact_whatsapp text,
  contact_address text,
  footer_text text DEFAULT 'جميع الحقوق محفوظة',
  hero_title text DEFAULT 'اعثر على دوائك في أقرب صيدلية',
  hero_subtitle text DEFAULT 'ابحث عن الأدوية واعثر على أقرب صيدلية توفرها',
  facebook_url text,
  instagram_url text,
  twitter_url text,
  about_title text,
  about_text text,
  features_json text,
  announcement_text text,
  announcement_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_site_settings" ON site_settings;
CREATE POLICY "anon_select_site_settings" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_site_settings" ON site_settings;
CREATE POLICY "anon_insert_site_settings" ON site_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_site_settings" ON site_settings;
CREATE POLICY "anon_update_site_settings" ON site_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_site_settings" ON site_settings;
CREATE POLICY "anon_delete_site_settings" ON site_settings FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- إدراج صف الإعدادات الافتراضي
-- ============================================
INSERT INTO site_settings (site_name, site_tagline)
SELECT 'صيدليتي', 'صيدلياتك القريبة منك في مكان واحد'
WHERE NOT EXISTS (SELECT 1 FROM site_settings);
