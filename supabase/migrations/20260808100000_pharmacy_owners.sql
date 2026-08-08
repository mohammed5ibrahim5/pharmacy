-- ============================================
-- جدول أصحاب الصيدليات (Pharmacy Owners)
-- حساب مخصص لكل صيدلية لإدارتها من صفحة /admin/pharmacy
-- نفس أسلوب جدول العملاء (customers): مصادقة مخصصة + كلمة مرور مشفرة
-- ============================================

CREATE TABLE IF NOT EXISTS pharmacy_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pharmacy_owners ENABLE ROW LEVEL SECURITY;

-- السماح بقراءة الحسابات (لتسجيل دخول المالك والتحقق من وجود الحساب)
DROP POLICY IF EXISTS "pharmacy_owners_public_select" ON pharmacy_owners;
CREATE POLICY "pharmacy_owners_public_select" ON pharmacy_owners FOR SELECT
  TO anon, authenticated
  USING (true);

-- السماح بإنشاء الحساب من لوحة إدارة الموقع
DROP POLICY IF EXISTS "pharmacy_owners_public_insert" ON pharmacy_owners;
CREATE POLICY "pharmacy_owners_public_insert" ON pharmacy_owners FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح بتحديث الحساب (إدارة المدير لتغيير كلمة المرور / التعطيل)
DROP POLICY IF EXISTS "pharmacy_owners_public_update" ON pharmacy_owners;
CREATE POLICY "pharmacy_owners_public_update" ON pharmacy_owners FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- السماح بحذف الحساب (حذف حساب المالك من إدارة الموقع)
DROP POLICY IF EXISTS "pharmacy_owners_public_delete" ON pharmacy_owners;
CREATE POLICY "pharmacy_owners_public_delete" ON pharmacy_owners FOR DELETE
  TO anon, authenticated
  USING (true);
