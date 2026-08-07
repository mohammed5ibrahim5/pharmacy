-- ============================================
-- سلة موحدة من عدة صيدليات في توصيلة واحدة
-- ============================================
-- جدول مجموعات الطلبات (تجميع عدة منتجات من صيدليات مختلفة في طلب واحد)
-- يرتبط كل صف في orders بمجموعة عبر order_group_id

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

DROP POLICY IF EXISTS "order_groups_public_select" ON order_groups;
CREATE POLICY "order_groups_public_select" ON order_groups FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "order_groups_public_insert" ON order_groups;
CREATE POLICY "order_groups_public_insert" ON order_groups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "order_groups_public_update" ON order_groups;
CREATE POLICY "order_groups_public_update" ON order_groups FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ربط كل منتج بمجموعة الطلب
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_group_id uuid REFERENCES order_groups(id) ON DELETE SET NULL;
