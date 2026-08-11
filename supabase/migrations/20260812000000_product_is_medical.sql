-- ============================================================
-- Product medical-use flag: is_medical (true = بوظيفة طبية)
-- Products marked false show "بدون وظيفة طبية" on the card.
-- Run in Supabase SQL Editor, then reload the page to refresh schema cache.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_medical boolean NOT NULL DEFAULT true;
