-- ============================================================
-- Product medical info (Feature #2): how to use + contraindications + interactions
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS how_to_use text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS contraindications text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS interactions text;

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
