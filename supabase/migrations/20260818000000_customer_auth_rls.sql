-- ============================================================
-- ترحيل العملاء إلى Supabase Auth الحقيقي + تشديد RLS الكامل
-- الأدوار: عميل (بياناته فقط) + مدير الموقع (is_site_admin) + مالك الصيدلية (صيدليته فقط)
-- شغّل هذا الملف في Supabase SQL Editor (يمكن إعادة تشغيله بأمان)
-- بعد التشغيل: قم بتعطيل "Confirm email" من Auth > Providers > Email إن لم تكن
-- معطلة، حتى يكتمل تسجيل العملاء بدون رابط تأكيد.
-- ============================================================

-- ------------------------------------------------------------
-- 0) دالة معرفة صيدلية المالك الحالي (SECURITY DEFINER)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_owner_pharmacy_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT pharmacy_id FROM public.pharmacy_owners
  WHERE id = auth.uid() AND is_active = true
  LIMIT 1
$$;

-- ------------------------------------------------------------
-- 1) إعادة بناء مفاتيح customer_id بإضافة ON UPDATE CASCADE
--    حتى يبقى customers.id == auth.uid() ويحدث التتابع لكل البيانات
-- ------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tc.table_name AS tbl, tc.constraint_name AS con, rc.delete_rule AS dr
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.constraint_schema
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
     AND kcu.table_name = tc.table_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'customer_id'
      AND ccu.table_name = 'customers'
      AND ccu.column_name = 'id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.con);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON UPDATE CASCADE ON DELETE %s',
      r.tbl, r.con, r.dr
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2) معالج إنشاء صف العميل عند إنشاء مستخدم Supabase Auth
--    customers.id == user_id == auth.uid()
--    إذا وجد عميل قديم بنفس البريد: يعيد ربطه بدون فقد بياناته
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_name text := NEW.raw_user_meta_data ->> 'full_name';
  v_phone text := NEW.raw_user_meta_data ->> 'phone';
BEGIN
  SELECT id INTO v_existing
  FROM public.customers
  WHERE email = NEW.email OR user_id = NEW.id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.customers
       SET id = NEW.id,
           user_id = NEW.id,
           email = NEW.email,
           full_name = COALESCE(NULLIF(full_name, ''), v_name),
           phone = COALESCE(phone, NULLIF(v_phone, '')),
           updated_at = now()
     WHERE id = v_existing;
  ELSE
    INSERT INTO public.customers (id, user_id, email, full_name, phone, avatar_url)
    VALUES (NEW.id, NEW.id, NEW.email, v_name, NULLIF(v_phone, ''), NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- مزامنة البريد الإلكتروني عند تغييره من لوحة Auth
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers SET email = NEW.email, updated_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_update ON auth.users;
CREATE TRIGGER on_auth_user_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();

-- ------------------------------------------------------------
-- 3) إنشاء الجداول الناقصة التى كانت تُنشأ يدوياً (للنسخ الجديدة)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  type text,
  title text,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  rating int NOT NULL DEFAULT 5,
  comment text,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  delivery_rating int CHECK (delivery_rating BETWEEN 1 AND 5),
  product_quality_rating int CHECK (product_quality_rating BETWEEN 1 AND 5),
  value_rating int CHECK (value_rating BETWEEN 1 AND 5),
  is_visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text,
  discount_type text,
  value numeric,
  min_order numeric,
  max_discount numeric,
  usage_limit int,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ------------------------------------------------------------
-- 4) إزالة كل سياسات RLS العامة القديمة من جداول الأعمال
-- ------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'customers','orders','order_groups','prescriptions','family_members',
        'notifications','loyalty_transactions','stock_alerts','medication_reminders',
        'reviews','coupons','newsletter_subscribers','categories','pharmacies',
        'products','discounts','site_settings','homepage_sections','pharmacy_sections'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 5) سياسات RLS الجديدة
-- ============================================================

-- ---------- customers ----------
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_site_admin()
    OR (public.current_owner_pharmacy_id() IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.customer_id = customers.id
                      AND o.pharmacy_id = public.current_owner_pharmacy_id()))
  );

CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_site_admin())
  WITH CHECK (auth.uid() = id OR public.is_site_admin());

CREATE POLICY "customers_delete_own" ON public.customers FOR DELETE
  TO authenticated
  USING (auth.uid() = id OR public.is_site_admin());

-- ---------- orders ----------
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_site_admin()
    OR pharmacy_id = public.current_owner_pharmacy_id()
  );

CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "orders_delete_admin" ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- ---------- order_groups ----------
CREATE POLICY "order_groups_select_own" ON public.order_groups FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "order_groups_insert_own" ON public.order_groups FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "order_groups_update_own" ON public.order_groups FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "order_groups_delete_admin" ON public.order_groups FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- ---------- prescriptions ----------
-- الإدراج متاح للعميل (customer_id = auth.uid()) وللضيف (customer_id null - ميزة الروشتة بدون حساب)
CREATE POLICY "prescriptions_select_own" ON public.prescriptions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "prescriptions_insert_own" ON public.prescriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (customer_id IS NULL OR customer_id = auth.uid());

CREATE POLICY "prescriptions_update_admin" ON public.prescriptions FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE POLICY "prescriptions_delete_own" ON public.prescriptions FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

-- ---------- family_members ----------
CREATE POLICY "family_members_select_own" ON public.family_members FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "family_members_insert_own" ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "family_members_update_own" ON public.family_members FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "family_members_delete_own" ON public.family_members FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

-- ---------- notifications ----------
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "notifications_insert_admin" ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

CREATE POLICY "notifications_delete_admin" ON public.notifications FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- ---------- loyalty_transactions ----------
CREATE POLICY "loyalty_select_own" ON public.loyalty_transactions FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "loyalty_insert_own" ON public.loyalty_transactions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

-- ---------- stock_alerts ----------
CREATE POLICY "stock_alerts_select_own" ON public.stock_alerts FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "stock_alerts_insert_own" ON public.stock_alerts FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "stock_alerts_delete_own" ON public.stock_alerts FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

-- ---------- medication_reminders ----------
CREATE POLICY "reminders_select_own" ON public.medication_reminders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "reminders_insert_own" ON public.medication_reminders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "reminders_delete_own" ON public.medication_reminders FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

-- ---------- reviews ----------
CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (
    is_visible = true
    OR public.is_site_admin()
    OR pharmacy_id = public.current_owner_pharmacy_id()
  );

CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin())
  WITH CHECK (customer_id = auth.uid() OR public.is_site_admin());

CREATE POLICY "reviews_delete_own" ON public.reviews FOR DELETE
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_site_admin());

-- ---------- coupons (إدارة الأدمن فقط) ----------
CREATE POLICY "coupons_select_admin" ON public.coupons FOR SELECT
  TO authenticated USING (public.is_site_admin());

CREATE POLICY "coupons_insert_admin" ON public.coupons FOR INSERT
  TO authenticated WITH CHECK (public.is_site_admin());

CREATE POLICY "coupons_update_admin" ON public.coupons FOR UPDATE
  TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());

CREATE POLICY "coupons_delete_admin" ON public.coupons FOR DELETE
  TO authenticated USING (public.is_site_admin());

-- ---------- newsletter_subscribers ----------
CREATE POLICY "newsletter_subscribers_insert" ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "newsletter_subscribers_select_admin" ON public.newsletter_subscribers FOR SELECT
  TO authenticated USING (public.is_site_admin());

CREATE POLICY "newsletter_subscribers_delete_admin" ON public.newsletter_subscribers FOR DELETE
  TO authenticated USING (public.is_site_admin());

-- ---------- جداول المتجر العامة: قراءة عامة + كتابة الأدمن ----------
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());
CREATE POLICY "categories_update_admin" ON public.categories FOR UPDATE TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE TO authenticated USING (public.is_site_admin());

CREATE POLICY "pharmacies_select" ON public.pharmacies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pharmacies_insert_admin" ON public.pharmacies FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());
CREATE POLICY "pharmacies_update_admin" ON public.pharmacies FOR UPDATE TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "pharmacies_delete_admin" ON public.pharmacies FOR DELETE TO authenticated USING (public.is_site_admin());

CREATE POLICY "products_select" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products_insert_admin" ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());
CREATE POLICY "products_update_admin" ON public.products FOR UPDATE TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE TO authenticated USING (public.is_site_admin());

CREATE POLICY "discounts_select" ON public.discounts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "discounts_insert_admin" ON public.discounts FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());
CREATE POLICY "discounts_update_admin" ON public.discounts FOR UPDATE TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "discounts_delete_admin" ON public.discounts FOR DELETE TO authenticated USING (public.is_site_admin());

CREATE POLICY "site_settings_select" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "site_settings_delete_admin" ON public.site_settings FOR DELETE TO authenticated USING (public.is_site_admin());

CREATE POLICY "homepage_sections_select" ON public.homepage_sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "homepage_sections_insert_admin" ON public.homepage_sections FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());
CREATE POLICY "homepage_sections_update_admin" ON public.homepage_sections FOR UPDATE TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "homepage_sections_delete_admin" ON public.homepage_sections FOR DELETE TO authenticated USING (public.is_site_admin());

CREATE POLICY "pharmacy_sections_select" ON public.pharmacy_sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pharmacy_sections_insert_admin" ON public.pharmacy_sections FOR INSERT TO authenticated WITH CHECK (public.is_site_admin());
CREATE POLICY "pharmacy_sections_delete_admin" ON public.pharmacy_sections FOR DELETE TO authenticated USING (public.is_site_admin());

-- ============================================================
-- 6) تخزين الصور (Storage) — خصوصية الروشتات وصور الدفع
-- ============================================================

-- البوكيتات الخاصة تصير private (لا قراءة عامة)
INSERT INTO storage.buckets (id, name, public) VALUES ('payments', 'payments', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- إزالة كل السياسات القديمة على هذه البوكيتات بجانب images
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (pg_get_expr(polqual, 0) LIKE '%payments%'
           OR pg_get_expr(polqual, 0) LIKE '%prescriptions%'
           OR pg_get_expr(polqual, 0) LIKE '%images%'
           OR pg_get_expr(polwithcheck, 0) LIKE '%payments%'
           OR pg_get_expr(polwithcheck, 0) LIKE '%prescriptions%'
           OR pg_get_expr(polwithcheck, 0) LIKE '%images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- images: قراءة عامة (صور المنتجات والصيدليات) + رفع/حذف الأدمن فقط
CREATE POLICY "images_storage_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'images');
CREATE POLICY "images_storage_upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'images' AND public.is_site_admin());
CREATE POLICY "images_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'images' AND public.is_site_admin());

-- prescriptions: الرفع متاح للعميل والضيف، والقراءة للمالك والأدمن فقط
-- (مسار الملف: <auth.uid()>/rx_xxx.png أو guest/rx_xxx.png)
CREATE POLICY "prescriptions_storage_upload" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'prescriptions');
CREATE POLICY "prescriptions_storage_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND (public.is_site_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );
CREATE POLICY "prescriptions_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'prescriptions'
    AND (public.is_site_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

-- payments: الرفع للعميل صاحب الملف فقط، والقراءة له وللأدمن
-- (مسار الملف: <auth.uid()>/pay_xxx.png)
CREATE POLICY "payments_storage_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "payments_storage_read" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payments'
    AND (public.is_site_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );
CREATE POLICY "payments_storage_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payments'
    AND (public.is_site_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ============================================================
-- 7) إحصائيات المتجر (بديل القراءة العامة لجدول الأوردرات)
--    HomePage كان يقرأ كل الأوردرات لإظهار الأكثر طلباً — الآن عبر RPC آمن
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_store_order_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'popular', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'cnt', cnt) ORDER BY cnt DESC)
      FROM (
        SELECT product_id, count(*) AS cnt
        FROM public.orders
        WHERE status <> 'cancelled' AND product_id IS NOT NULL
        GROUP BY product_id
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ), '[]'::jsonb),
    'pharmacy_counts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('pharmacy_id', pharmacy_id, 'cnt', cnt))
      FROM (
        SELECT pharmacy_id, count(*) AS cnt
        FROM public.orders
        WHERE pharmacy_id IS NOT NULL
        GROUP BY pharmacy_id
      ) t
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_order_stats() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';