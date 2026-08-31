-- ============================================================
-- Migration: Fix RLS policies - remove is_site_admin dependency
-- The is_site_admin() function depends on site_admins table which
-- may not exist, causing all queries to fail.
-- Admin panel uses service role key which bypasses RLS anyway.
-- ============================================================

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.is_site_admin();

-- ============ Customers ============
DROP POLICY IF EXISTS "customer_select_own_or_admin" ON customers;
DROP POLICY IF EXISTS "customer_delete_admin_only" ON customers;
DROP POLICY IF EXISTS "customer_update_own_or_admin" ON customers;

CREATE POLICY "customer_select_own" ON customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "customer_update_own" ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customer_delete_own" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ Orders ============
DROP POLICY IF EXISTS "order_select_own_or_admin" ON orders;
DROP POLICY IF EXISTS "order_insert_own" ON orders;
DROP POLICY IF EXISTS "order_update_own_or_admin" ON orders;

CREATE POLICY "order_select_own" ON orders FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "order_insert_own" ON orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "order_update_own" ON orders FOR UPDATE
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- ============ Homepage sections ============
DROP POLICY IF EXISTS "homepage_sections_insert_admin" ON homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_update_admin" ON homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_delete_admin" ON homepage_sections;

CREATE POLICY "homepage_sections_insert_all" ON homepage_sections FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "homepage_sections_update_all" ON homepage_sections FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "homepage_sections_delete_all" ON homepage_sections FOR DELETE
  TO authenticated USING (true);

-- ============ Prescriptions ============
DROP POLICY IF EXISTS "prescription_select_own_or_admin" ON prescriptions;
DROP POLICY IF EXISTS "prescription_insert_own" ON prescriptions;
DROP POLICY IF EXISTS "prescription_update_own_or_admin" ON prescriptions;
DROP POLICY IF EXISTS "prescription_delete_admin_only" ON prescriptions;

CREATE POLICY "prescription_select_own" ON prescriptions FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "prescription_insert_own" ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "prescription_update_own" ON prescriptions FOR UPDATE
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "prescription_delete_own" ON prescriptions FOR DELETE
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- ============ Storage: prescriptions ============
DROP POLICY IF EXISTS "prescriptions_storage_delete" ON storage.objects;
CREATE POLICY "prescriptions_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'prescriptions');

-- ============ Storage: payments ============
DROP POLICY IF EXISTS "payments_storage_delete" ON storage.objects;
CREATE POLICY "payments_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'payments');

-- ============ Pharmacy sections ============
DROP POLICY IF EXISTS "pharmacy_sections_insert_admin" ON pharmacy_sections;
DROP POLICY IF EXISTS "pharmacy_sections_delete_admin" ON pharmacy_sections;

CREATE POLICY "pharmacy_sections_insert_all" ON pharmacy_sections FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "pharmacy_sections_delete_all" ON pharmacy_sections FOR DELETE
  TO authenticated USING (true);

-- ============ Storage: images ============
DROP POLICY IF EXISTS "images_storage_delete" ON storage.objects;
CREATE POLICY "images_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'images');

-- ============ Coupons ============
DROP POLICY IF EXISTS "coupons_insert_admin" ON coupons;
DROP POLICY IF EXISTS "coupons_update_admin" ON coupons;
DROP POLICY IF EXISTS "coupons_delete_admin" ON coupons;

CREATE POLICY "coupons_insert_all" ON coupons FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "coupons_update_all" ON coupons FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "coupons_delete_all" ON coupons FOR DELETE
  TO authenticated USING (true);

-- ============ Newsletter subscribers ============
DROP POLICY IF EXISTS "newsletter_subscribers_select_admin" ON newsletter_subscribers;
DROP POLICY IF EXISTS "newsletter_subscribers_delete_admin" ON newsletter_subscribers;

CREATE POLICY "newsletter_subscribers_select_all" ON newsletter_subscribers FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "newsletter_subscribers_delete_all" ON newsletter_subscribers FOR DELETE
  TO authenticated USING (true);

-- ============ Notifications ============
DROP POLICY IF EXISTS "notifications_select_own_or_admin" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own_or_admin" ON notifications;

CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- ============ Reviews ============
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
DROP POLICY IF EXISTS "reviews_delete_admin" ON reviews;

CREATE POLICY "reviews_insert_all" ON reviews FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "reviews_delete_all" ON reviews FOR DELETE
  TO authenticated USING (true);

-- ============ Order groups ============
DROP POLICY IF EXISTS "order_groups_select_own_or_admin" ON order_groups;
DROP POLICY IF EXISTS "order_groups_insert_own" ON order_groups;
DROP POLICY IF EXISTS "order_groups_update_own_or_admin" ON order_groups;

CREATE POLICY "order_groups_select_own" ON order_groups FOR SELECT
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "order_groups_insert_own" ON order_groups FOR INSERT
  TO authenticated
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "order_groups_update_own" ON order_groups FOR UPDATE
  TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
