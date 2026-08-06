-- ============================================================
-- Order reviews: let customers rate a delivered order
-- Run in Supabase SQL Editor after the previous migrations.
-- ============================================================

-- Link reviews to a specific order + prevent duplicate reviews per order
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES orders(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS delivery_rating int CHECK (delivery_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS product_quality_rating int CHECK (product_quality_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS value_rating int CHECK (value_rating BETWEEN 1 AND 5);

-- Allow only one review per order
DROP INDEX IF EXISTS reviews_order_unique;
CREATE UNIQUE INDEX reviews_order_unique ON reviews (order_id) WHERE order_id IS NOT NULL;

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
