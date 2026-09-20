-- ============================================================
-- 20260907140000_customers_prescriptions_reviews_select.sql
-- تكملة إغلاق الثغرات (تشمل مقترحات: العملاء + الروشتات + قراءة التقييمات).
--
-- ملاحظة معمّرة: RLS/الطبقة الحديثة تعتمد على customer_id = customers.id
-- (مطابق في العملي لـ auth.uid بواسطة طبقة place_order/*_own). لذلك نُبقي
-- سياسات الخدمة الذاتية تعمل بأيٍّ من النموذجين (id أو user_id) حمايةً.
--
-- المحتوى:
--   (أ) customers   : إزالة سياسات عامة (anon) للقراءة/التحديث/الحذف،
--                     مع سياسة خدمة ذاتية قوية (id أو user_id) + admin.
--   (ب) prescriptions: حذف التحديث/الحذف العـام (يبقى الإدراج والقراءة
--                     لخاصية روشتة الضيف)؛ الحالات الحاسمة محميَّة أصلاً
--                     عبر guard_rx_terminal_status و prescriptions_update_admin.
--   (ج) reviews     : منع قراءة كل التقييمات بما فيها المخفية من الزائر،
--                     مع إتاحة العميل لرؤية تقييمه (حتى المخفي).
--
-- آمن لتكرار التطبيق عبر DROP POLICY IF EXISTS.
-- ============================================================

-- ------------------------------------------------------------
-- (أ) customers — إغلاق العامة + توفير سياسة ذاتية قوية
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "customer_public_select" ON public.customers;
DROP POLICY IF EXISTS "customer_public_insert" ON public.customers;
DROP POLICY IF EXISTS "customer_public_update" ON public.customers;
DROP POLICY IF EXISTS "customer_public_delete" ON public.customers;

-- SELECT: الذاتي (بأي من النموذجين) / admin / مالك صيدليته التي طلب منها
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR auth.uid() = user_id
    OR public.is_site_admin()
    OR (public.current_owner_pharmacy_id() IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.customer_id = customers.id
                      AND o.pharmacy_id = public.current_owner_pharmacy_id()))
  );

-- INSERT مسموح فقط عبر trigger على auth.users (security definer).
-- لا نُنشئ سياسة إدراج عامة؛ فلا يمكن للزائر إدراج صف مباشرةً.

-- UPDATE: الذاتي (أي نموذج) / admin
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR auth.uid() = user_id OR public.is_site_admin())
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id OR public.is_site_admin());

-- DELETE: الذاتي (أي نموذج) / admin
DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
CREATE POLICY "customers_delete_own" ON public.customers FOR DELETE
  TO authenticated
  USING (auth.uid() = id OR auth.uid() = user_id OR public.is_site_admin());

-- ------------------------------------------------------------
-- (ب) prescriptions — إغلاق التحديث/الحذف العـام
--     (نُبقي insert + select لخاصية الروشتة بدون حساب)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "prescription_public_update" ON public.prescriptions;
DROP POLICY IF EXISTS "prescription_public_delete" ON public.prescriptions;

-- ------------------------------------------------------------
-- (ج) reviews — منع قراءة كل التقييمات (بما فيها المخفية) من الزائر
--     والعميل يظل يرى تقييمه حتى لو كان مخفياً
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_public_select" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (
    is_visible = true
    OR customer_id = auth.uid()
    OR public.is_site_admin()
    OR pharmacy_id = public.current_owner_pharmacy_id()
  );

-- إعادة تحميل مخطط PostgREST حتى تظهر السياسات الجديدة فوراً
NOTIFY pgrst, 'reload schema';
