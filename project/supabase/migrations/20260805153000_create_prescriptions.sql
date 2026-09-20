-- ============================================
-- جدول الروشتات (Prescriptions)
-- ============================================
-- يخزن الروشتات الطبية المرفوعة من العملاء
-- الصورة تُرفع إلى Storage Bucket باسم "prescriptions"
-- ويُحفظ هنا الرابط + بيانات التواصل + حالة المعالجة

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

-- السماح للجميع بقراءة الروشتات (لأغراض العرض في اللوحة والحساب)
DROP POLICY IF EXISTS "prescription_public_select" ON prescriptions;
CREATE POLICY "prescription_public_select" ON prescriptions FOR SELECT
  TO anon, authenticated
  USING (true);

-- السماح للجميع بإنشاء روشتة (نظام مصادقة مخصص)
DROP POLICY IF EXISTS "prescription_public_insert" ON prescriptions;
CREATE POLICY "prescription_public_insert" ON prescriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح بتحديث حالة الروشتة
DROP POLICY IF EXISTS "prescription_public_update" ON prescriptions;
CREATE POLICY "prescription_public_update" ON prescriptions FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- السماح بحذف الروشتة
DROP POLICY IF EXISTS "prescription_public_delete" ON prescriptions;
CREATE POLICY "prescription_public_delete" ON prescriptions FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============ Storage Bucket لصور الروشتات ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('prescriptions', 'prescriptions', true)
ON CONFLICT (id) DO NOTHING;

-- قراءة صور الروشتات
DROP POLICY IF EXISTS "prescriptions_storage_read" ON storage.objects;
CREATE POLICY "prescriptions_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'prescriptions');

-- رفع صور الروشتات
DROP POLICY IF EXISTS "prescriptions_storage_upload" ON storage.objects;
CREATE POLICY "prescriptions_storage_upload" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'prescriptions');

-- حذف صور الروشتات
DROP POLICY IF EXISTS "prescriptions_storage_delete" ON storage.objects;
CREATE POLICY "prescriptions_storage_delete" ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'prescriptions');

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
