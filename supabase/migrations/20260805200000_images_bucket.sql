-- ============================================================
-- Generic storage bucket for uploaded images (admin products/pharmacies/avatars)
-- Any image can be uploaded from the device OR provided as a link.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "images_storage_read" ON storage.objects;
CREATE POLICY "images_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'images');

DROP POLICY IF EXISTS "images_storage_upload" ON storage.objects;
CREATE POLICY "images_storage_upload" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'images');

DROP POLICY IF EXISTS "images_storage_delete" ON storage.objects;
CREATE POLICY "images_storage_delete" ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'images');

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
