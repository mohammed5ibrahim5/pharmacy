-- ============================================
-- جدول الطلبات (Orders)
-- ============================================
-- يخزن طلبات العملاء للمنتجات من الصيدليات
-- مرتبط بجدول العملاء والمنتجات والصيدليات
-- نظام مصادقة مخصص (بدون Supabase Auth) - نسمح بالإدراج للجميع

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

-- السماح للجميع (anon + authenticated) بقراءة الطلبات (لأغراض العرض)
DROP POLICY IF EXISTS "order_public_select" ON orders;
CREATE POLICY "order_public_select" ON orders FOR SELECT
  TO anon, authenticated
  USING (true);

-- السماح للجميع بإنشاء طلب (نظام مصادقة مخصص)
DROP POLICY IF EXISTS "order_public_insert" ON orders;
CREATE POLICY "order_public_insert" ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح بتحديث الطلبات
DROP POLICY IF EXISTS "order_public_update" ON orders;
CREATE POLICY "order_public_update" ON orders FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);
