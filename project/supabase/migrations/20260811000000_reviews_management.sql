-- ============================================================
-- Reviews management: show/hide (is_visible) + manual ordering
-- Run in Supabase SQL Editor, then reload the page to refresh schema cache.
-- ============================================================

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Seed initial order from creation time so older reviews stay first
UPDATE reviews SET sort_order = COALESCE((
  SELECT count(*) FROM reviews r2 WHERE r2.created_at < reviews.created_at
), 0);
