-- ============================================================
-- Loyalty points + stock availability alerts
-- Run in Supabase SQL Editor after the main setup file.
-- ============================================================

-- 1) Loyalty points column on customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

-- 2) Loyalty transactions history
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_public_select" ON loyalty_transactions;
CREATE POLICY "loyalty_public_select" ON loyalty_transactions FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "loyalty_public_insert" ON loyalty_transactions;
CREATE POLICY "loyalty_public_insert" ON loyalty_transactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3) Stock availability alerts
CREATE TABLE IF NOT EXISTS stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (customer_id, product_id)
);

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_alerts_public_select" ON stock_alerts;
CREATE POLICY "stock_alerts_public_select" ON stock_alerts FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "stock_alerts_public_insert" ON stock_alerts;
CREATE POLICY "stock_alerts_public_insert" ON stock_alerts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "stock_alerts_public_delete" ON stock_alerts;
CREATE POLICY "stock_alerts_public_delete" ON stock_alerts FOR DELETE
  TO anon, authenticated
  USING (true);

-- 4) Medication reminders (per customer, kept on device but mirrored here for cross-device sync)
CREATE TABLE IF NOT EXISTS medication_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dose text,
  time_of_day text NOT NULL,
  repeat_daily boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reminders_public_select" ON medication_reminders;
CREATE POLICY "reminders_public_select" ON medication_reminders FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "reminders_public_insert" ON medication_reminders;
CREATE POLICY "reminders_public_insert" ON medication_reminders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "reminders_public_delete" ON medication_reminders;
CREATE POLICY "reminders_public_delete" ON medication_reminders FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
