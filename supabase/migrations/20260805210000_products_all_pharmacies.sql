-- ============================================================
-- Products: support "available in all pharmacies" flag
-- When for_all_pharmacies = true, the product appears in every pharmacy.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS for_all_pharmacies boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_all_pharmacies ON products(for_all_pharmacies);

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
