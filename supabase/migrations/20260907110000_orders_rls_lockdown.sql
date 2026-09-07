-- ============================================================
-- 20260907110000_orders_rls_lockdown.sql
-- إغلاق ثغرة الأمان على جداول الطلبات (orders + order_groups).
--
-- المشكلة المحلولة:
-- كان يوجد في الهجرات القديمة سياسات "عامة" على orders / order_groups
-- تتيح لأي زائر مجهول (anon) والمسجّل (authenticated) تنفيذ
-- INSERT / UPDATE / DELETE / SELECT على أي صف دون أي قيد:
--   - order_public_insert / order_public_update        (TO anon, authenticated USING true)
--   - order_groups_public_insert / _update / _select   (TO anon, authenticated)
-- هذا يعني أن أي شخص يستطيع تعديل أو حذف أو صنع طلبات لأي عميل،
-- وقراءة كل الطلبات (بما فيها أرقام الهواتف والعناوين).
--
-- الحل:
-- حذف السياسات العامة فقط؛ وبذلك تبقى السياسات المتخصصة القائمة
-- (من 20260818000000_customer_auth_rls.sql و 20260827100000_owner_admin_rls.sql)
-- هي النافذة الوحيدة للوصول:
--   - anon: لا وصول مباشر — كل شيء يمرّ عبر RPCs المحصّن (SECURITY DEFINER):
--           place_order / place_order_guest / track_guest_orders
--   - authenticated: قراءة/كتابة صفوفه فقط (customer_id = auth.uid())
--   - المالك: طلبات صيدليته فقط
--   - admin: إدارة شاملة عبر is_site_admin()
--
-- آمن لتكرار التطبيق (idempotent) بفضل DROP POLICY IF EXISTS.
-- ============================================================

-- ------------------------------------------------------------
-- 1) orders — إزالة السياسات العامة (لا يُبقي إلا المتخصصة)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "order_public_select" ON public.orders;
DROP POLICY IF EXISTS "order_public_insert" ON public.orders;
DROP POLICY IF EXISTS "order_public_update" ON public.orders;

-- إعادة تأكيد تعريفات الوصول الآمن (احتياطياً إن لم تكن موجودة):
-- SELECT: العميل صفوفه / الأدمن كل شيء / المالك طلبات صيدليته
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_site_admin()
    OR pharmacy_id = public.current_owner_pharmacy_id()
  );

-- INSERT: العميل يضيف صفاً لنفسه فقط / الأدمن (الكتابة الفعلية عبر RPC)
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

-- UPDATE: العميل صفوفه / الأدمن الكل / المالك طلبات صيدليته
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

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

-- DELETE: الأدمن فقط
DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;
CREATE POLICY "orders_delete_admin" ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- ------------------------------------------------------------
-- 2) order_groups — إزالة السياسات العامة
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "order_groups_public_select" ON public.order_groups;
DROP POLICY IF EXISTS "order_groups_public_insert" ON public.order_groups;
DROP POLICY IF EXISTS "order_groups_public_update" ON public.order_groups;

-- SELECT: العميل مجموعاته / الأدمن الكل
DROP POLICY IF EXISTS "order_groups_select_own" ON public.order_groups;
CREATE POLICY "order_groups_select_own" ON public.order_groups FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

-- INSERT: العميل لمجموعته / الأدمن (الكتابة الفعلية عبر RPC)
DROP POLICY IF EXISTS "order_groups_insert_own" ON public.order_groups;
CREATE POLICY "order_groups_insert_own" ON public.order_groups FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

-- UPDATE: العميل مجموعته / الأدمن الكل
DROP POLICY IF EXISTS "order_groups_update_own" ON public.order_groups;
CREATE POLICY "order_groups_update_own" ON public.order_groups FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

-- DELETE: الأدمن فقط
DROP POLICY IF EXISTS "order_groups_delete_admin" ON public.order_groups;
CREATE POLICY "order_groups_delete_admin" ON public.order_groups FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- إعادة تحميل مخطط PostgREST حتى تظهر السياسات الجديدة فوراً
NOTIFY pgrst, 'reload schema';
