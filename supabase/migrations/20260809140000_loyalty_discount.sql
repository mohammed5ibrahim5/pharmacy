-- ============================================================
-- Loyalty redemption at checkout: apply points discount to order
-- Run in Supabase SQL Editor after the previous migrations.
-- ============================================================

-- خصم النقاط المطبق على الطلب (ج.م) وعدد النقاط المستبدلة
ALTER TABLE order_groups ADD COLUMN IF NOT EXISTS loyalty_discount numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE order_groups ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0;

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
