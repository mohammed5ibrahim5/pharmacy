-- ============================================================
-- 20260827100000_owner_admin_rls.sql
-- تفعيل لوحة مالك الصيدلية: إتاحة الكتابة لمالك صيدليته فقط
-- على جداول التشغيل (products, orders, pharmacies) مع بقاء
-- حد الصلاحية محصوراً في `pharmacy_id = current_owner_pharmacy_id()`.
--
-- المشكلة التي تُحل:
-- كانت سياسات الكتابة على هذه الجداول لأدمن الموقع فقط
-- (is_site_admin)، فلوحة المالك كانت "تظهر النجاح" لكن كل عمليات
-- الإضافة/التعديل/الحذف تفشل في قاعدة البيانات (RLS تمنعها).
--
-- الحل: سياسات مالك إضافية صارمة:
--   - products  : INSERT يشترط pharmacy_id = صيدلية المالك،
--                 UPDATE/DELETE يشترط أن ينتمي الصف لصيدلية المالك
--   - orders    : UPDATE حالة الطلب لطلبات صيدلية المالك فقط
--                 (المالك لا ينشئ ولا يحذف الطلبات)
--   - pharmacies: UPDATE بيانات صيدلية المالك فقط
--   - discount  : إدارة خصومات صيدلية المالك فقط (جاهزة للتوسع)
-- ============================================================

-- ------------------------------------------------------------
-- 1) products — أذونات owner
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "products_insert_owner" ON public.products;
CREATE POLICY "products_insert_owner" ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  );

DROP POLICY IF EXISTS "products_update_owner" ON public.products;
CREATE POLICY "products_update_owner" ON public.products FOR UPDATE
  TO authenticated
  USING (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  )
  WITH CHECK (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  );

DROP POLICY IF EXISTS "products_delete_owner" ON public.products;
CREATE POLICY "products_delete_owner" ON public.products FOR DELETE
  TO authenticated
  USING (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  );

-- ------------------------------------------------------------
-- 2) orders — owner يحدّث حالة طلبات صيدليته فقط (لا إدراج/حذف)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "orders_update_owner" ON public.orders;
CREATE POLICY "orders_update_owner" ON public.orders FOR UPDATE
  TO authenticated
  USING (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  )
  WITH CHECK (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  );

-- ------------------------------------------------------------
-- 3) pharmacies — owner يحدّث بيانات صيدليته فقط
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "pharmacies_update_owner" ON public.pharmacies;
CREATE POLICY "pharmacies_update_owner" ON public.pharmacies FOR UPDATE
  TO authenticated
  USING (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND id = public.current_owner_pharmacy_id()
  )
  WITH CHECK (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND id = public.current_owner_pharmacy_id()
  );

-- ------------------------------------------------------------
-- 4) discounts — owner يدير خصومات صيدليته (منتجاتها)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "discounts_insert_owner" ON public.discounts;
CREATE POLICY "discounts_insert_owner" ON public.discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  );

DROP POLICY IF EXISTS "discounts_update_owner" ON public.discounts;
CREATE POLICY "discounts_update_owner" ON public.discounts FOR UPDATE
  TO authenticated
  USING (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  )
  WITH CHECK (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  );

DROP POLICY IF EXISTS "discounts_delete_owner" ON public.discounts;
CREATE POLICY "discounts_delete_owner" ON public.discounts FOR DELETE
  TO authenticated
  USING (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND pharmacy_id = public.current_owner_pharmacy_id()
  );

-- ------------------------------------------------------------
-- 5) notifications — owner يخطر العملاء الذين طلبوا من صيدليته
--    فقط (مطلوب عند تحديث حالة الطلب في لوحة المالك)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_insert_owner" ON public.notifications;
CREATE POLICY "notifications_insert_owner" ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_owner_pharmacy_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.customer_id = notifications.customer_id
        AND o.pharmacy_id = public.current_owner_pharmacy_id()
    )
  );

-- إعادة تحميل مخطط PostgREST حتى تظهر السياسات الجديدة فوراً
NOTIFY pgrst, 'reload schema';
