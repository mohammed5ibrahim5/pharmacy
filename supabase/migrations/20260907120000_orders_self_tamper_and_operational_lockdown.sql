-- ============================================================
-- 20260907120000_orders_self_tamper_and_operational_lockdown.sql
-- خطوتان:
--
-- (أ) إغلاق "التلاعب الذاتي" على الطلبات:
--     كان orders_update_own / order_groups_update_own يتيحان للمستخدم
--     المسجّل (authenticated) تحديث أي صف في طلبه مباشرةً — أي تغيير
--     status/total_price/address لأي طلب يخصه (customer_id = auth.uid()).
--     التطبيق لا يستخدم هذه الكتابة إطلاقاً (تحديث الحالة يتم فقط من
--     لوحة الأدمن/المالك). الحل: تقييد التحديث إلى is_site_admin() فقط،
--     مع بقاء سياسة المالك (orders_update_owner) على طلبات صيدليته.
--
-- (ب) توسيع قفل الكتابة لباقي الجداول التشغيلية الحساسة:
--     categories / pharmacies / products / discounts / site_settings
--     كانت لها سياسات "عامة" قديمة (anon_insert/update/delete_x
--     بـ TO anon, authenticated ... USING true) تجعل أي زائر مجهول
--     يعدّل/يحذف/يصنع أي صف. السياسات المتخصصة (x_insert/update/delete_admin
--     من 20260818000000_customer_auth_rls.sql، و x_update_owner من
--     20260827100000_owner_admin_rls.sql) موجودة مسبقاً؛ حذف العامة يُفعّل
--     التقييد الصحيح دون كسر الواجهات (الأدمن + المالك يبقيان على صلاحياتهما).
--
-- ملاحظة: عمود orders.status يتضمن قيمة 'shipped' منذ 20260805180000_order_payments.sql؛
-- لا حاجة لتعديله هنا.
--
-- آمن لتكرار التطبيق (idempotent) عبر DROP POLICY IF EXISTS.
-- ============================================================

-- ------------------------------------------------------------
-- (أ) الطلبات: منع تعديل المستخدم لطلبه — الأدمن/المالك فقط
-- ------------------------------------------------------------
-- orders: UPDATE -> admin فقط (المالك مفصول في سياسة مستقلة أدناه)
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- retain owner (تحديث حالة طلبات صيدلية المالك) — لم يتغير
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

-- order_groups: UPDATE -> admin فقط (لا يوجد مستخدم عميل أو مالك يحتاجها)
DROP POLICY IF EXISTS "order_groups_update_own" ON public.order_groups;
CREATE POLICY "order_groups_update_own" ON public.order_groups FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- ------------------------------------------------------------
-- (ب) الجداول التشغيلية الحساسة: حذف السياسات العامة فقط
--     (المتخصصة *_admin و *_owner تبقى وتفعّل تلقائياً)
-- ------------------------------------------------------------
-- categories -> categories_*_admin
DROP POLICY IF EXISTS "anon_insert_categories" ON public.categories;
DROP POLICY IF EXISTS "anon_update_categories" ON public.categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON public.categories;

-- pharmacies -> pharmacies_*_admin + pharmacies_update_owner
DROP POLICY IF EXISTS "anon_insert_pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "anon_update_pharmacies" ON public.pharmacies;
DROP POLICY IF EXISTS "anon_delete_pharmacies" ON public.pharmacies;

-- products -> products_*_admin + products_*_owner
DROP POLICY IF EXISTS "anon_insert_products" ON public.products;
DROP POLICY IF EXISTS "anon_update_products" ON public.products;
DROP POLICY IF EXISTS "anon_delete_products" ON public.products;

-- discounts -> discounts_*_admin + discounts_*_owner
DROP POLICY IF EXISTS "anon_insert_discounts" ON public.discounts;
DROP POLICY IF EXISTS "anon_update_discounts" ON public.discounts;
DROP POLICY IF EXISTS "anon_delete_discounts" ON public.discounts;

-- site_settings -> site_settings_*_admin
DROP POLICY IF EXISTS "anon_insert_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "anon_update_site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "anon_delete_site_settings" ON public.site_settings;

-- إعادة تحميل مخطط PostgREST حتى تظهر السياسات الجديدة فوراً
NOTIFY pgrst, 'reload schema';
