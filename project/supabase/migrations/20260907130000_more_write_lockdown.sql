-- ============================================================
-- 20260907130000_more_write_lockdown.sql
-- استكمال إغلاق ثغرات الكتابة على جداول إضافية، بعد
--   - 20260907110000_orders_rls_lockdown.sql (أساسيات الطلبات)
--   - 20260907120000_orders_self_tamper_and_operational_lockdown.sql
--     (التلاعب الذاتي + الجداول التشغيلية الخمسة)
--
-- هنا نغلق السياسات "العامة" المتبقية على:
--   orders (منع أي إدراج مباشر — كل الإنشاء عبر RPC محصّن)
--   homepage_sections / pharmacy_sections / coupons
--   reviews / notifications / loyalty_transactions / newsletter_subscribers
--
-- مبدأ التنفيذ: نُسقط سياسات blank العامة (anon/authenticated USING true)
-- فقط، فتُفعَّل تلقائياً السياسات المتخصصة الموجودة مسبقاً في
-- 20260818000000_customer_auth_rls.sql و 20260827100000_owner_admin_rls.sql
-- (x_insert/update/delete_admin، x_update_owner، x_*_own).
-- هذا يبقي الأدمن والمالك والعميل على صلاحياتهم الصحيحة ولا يكسر الواجهات.
--
-- آمن لتكرار التطبيق عبر DROP POLICY IF EXISTS.
-- ============================================================

-- ------------------------------------------------------------
-- 1) orders / order_groups — منع الإدراج المباشر نهائياً
--    (كل إنشاء الطلبات يتم حصراً عبر place_order / place_order_guest
--     وهما SECURITY DEFINER يتجاوزان RLS بصلاحيات مالك الجدول)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;

DROP POLICY IF EXISTS "order_groups_insert_own" ON public.order_groups;

-- ------------------------------------------------------------
-- 2) homepage_sections -> homepage_sections_*_admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "homepage_sections_public_insert" ON public.homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_public_update" ON public.homepage_sections;
DROP POLICY IF EXISTS "homepage_sections_public_delete" ON public.homepage_sections;

-- ------------------------------------------------------------
-- 3) pharmacy_sections -> pharmacy_sections_insert/delete_admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "pharmacy_sections_public_insert" ON public.pharmacy_sections;
DROP POLICY IF EXISTS "pharmacy_sections_public_delete" ON public.pharmacy_sections;

-- ------------------------------------------------------------
-- 4) coupons -> coupons_*_admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "coupons_public_insert" ON public.coupons;
DROP POLICY IF EXISTS "coupons_public_update" ON public.coupons;
DROP POLICY IF EXISTS "coupons_public_delete" ON public.coupons;

-- ------------------------------------------------------------
-- 5) reviews -> reviews_*_own (عميل يكتب تقييمه، الأدمن يدير)
--    لا يسمح بالكتابة لزائر مجهول
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_delete" ON public.reviews;

-- ------------------------------------------------------------
-- 6) notifications -> notifications_insert_admin/owner + update_own + delete_admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_public_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_public_update" ON public.notifications;

-- ------------------------------------------------------------
-- 7) loyalty_transactions -> loyalty_insert_own (لا كتابة لزائر)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "loyalty_public_insert" ON public.loyalty_transactions;

-- ------------------------------------------------------------
-- 8) newsletter_subscribers — نُبقي INSERT العام (تسجيل النشرة عام)
--    لكن نغلق الحذف العام -> newsletter_subscribers_delete_admin
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "newsletter_subscribers_public_delete" ON public.newsletter_subscribers;

-- إعادة تحميل مخطط PostgREST حتى تظهر السياسات الجديدة فوراً
NOTIFY pgrst, 'reload schema';
