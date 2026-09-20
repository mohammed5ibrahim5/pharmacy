-- ============================================================
-- Order payments: payment methods + transfer screenshot + status
-- ============================================================

-- Add payment columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

-- Extend status to include 'shipped' (تم الشحن - في الطريق)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

-- Create public storage bucket for payment screenshots
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
