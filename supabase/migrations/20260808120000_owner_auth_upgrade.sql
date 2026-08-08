-- ============================================
-- ترقية أمان حسابات أصحاب الصيدليات إلى Supabase Auth الحقيقي
-- بدلاً من التشفير المحلي: كلمة المرور تصبح bcrypt داخل auth.users (خدمة المصادقة)
-- والحساب يُنشأ فقط عبر دوال آمنة (SECURITY DEFINER) تقبل إدارة الموقع فقط
-- شغّل هذا الملف في Supabase SQL Editor (يمكن إعادة تشغيله بأمان)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- 1) دالة التحقق من مدير الموقع (بدون recursion في سياسات RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT exists(SELECT 1 FROM public.site_admins a WHERE a.email = auth.jwt()->>'email')
$$;

-- ------------------------------------------------------------
-- 2) جدول مديري الموقع (site_admins) — من يملك الحق في إدارة الحسابات
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_admins (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_admins ENABLE ROW LEVEL SECURITY;

-- القراءة فقط للمديرين أنفسهم (لأجل التحقق في صفحة /admin)
DROP POLICY IF EXISTS site_admins_select ON public.site_admins;
CREATE POLICY site_admins_select ON public.site_admins FOR SELECT
  TO authenticated
  USING (public.is_site_admin());

-- البذرة: إيميل مدير الموقع (غيّره/زد عليه لاحقاً عبر SQL)
INSERT INTO public.site_admins (email) VALUES ('mohammedibrahim@gmail.com')
  ON CONFLICT (email) DO NOTHING;

-- ------------------------------------------------------------
-- 3) جدول أصحاب الصيدليات: id يرتبط بحساب Supabase Auth الحقيقي
--    إزالة أعمدة كلمة المرور المحلية نهائياً (لم تعد موجودة في أي جدول)
-- ------------------------------------------------------------
ALTER TABLE public.pharmacy_owners DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.pharmacy_owners DROP COLUMN IF EXISTS password_salt;

ALTER TABLE public.pharmacy_owners ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.pharmacy_owners DROP CONSTRAINT IF EXISTS pharmacy_owners_id_fkey;
ALTER TABLE public.pharmacy_owners ADD CONSTRAINT pharmacy_owners_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.pharmacy_owners ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول الجديدة (لم تعد هناك سياسات إدراج/حذف عامة)
DROP POLICY IF EXISTS pharmacy_owners_public_select ON public.pharmacy_owners;
DROP POLICY IF EXISTS pharmacy_owners_public_insert ON public.pharmacy_owners;
DROP POLICY IF EXISTS pharmacy_owners_public_update ON public.pharmacy_owners;
DROP POLICY IF EXISTS pharmacy_owners_public_delete ON public.pharmacy_owners;
DROP POLICY IF EXISTS pharmacy_owners_select ON public.pharmacy_owners;

-- المالك يقرأ صفه فقط، والمدير يقرأ الكل
CREATE POLICY pharmacy_owners_select ON public.pharmacy_owners FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_site_admin());

-- ------------------------------------------------------------
-- 4) الدوال الآمنة (SECURITY DEFINER)
-- ------------------------------------------------------------

-- إنشاء حساب مالك + مستخدم Supabase Auth (bcrypt) في خطوة واحدة
CREATE OR REPLACE FUNCTION public.create_owner(
  p_pharmacy_id uuid,
  p_full_name text,
  p_email text,
  p_password text,
  p_phone text DEFAULT NULL
) RETURNS public.pharmacy_owners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_owner public.pharmacy_owners;
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'غير مصرح لك بإنشاء حسابات أصحاب الصيدليات';
  END IF;

  p_email := lower(trim(p_email));
  IF p_email = '' OR p_full_name IS NULL OR p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'بيانات الحساب غير صحيحة (كلمة المرور 6 أحرف على الأقل)';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'هذا البريد الإلكتروني مستخدم بالفعل';
  END IF;

  v_user_id := gen_random_uuid();
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
     reauthentication_token,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
     p_email, crypt(p_password, gen_salt('bf')), now(),
     '', '', '', '', '',
     '',
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('full_name', p_full_name),
     now(), now());

  -- صف هوية كما ينشئه GoTrue (ضروري لتسجيل الدخول بدون خطأ schema)
  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id, v_user_id::text, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    now(), now(), now());

  INSERT INTO public.pharmacy_owners (id, pharmacy_id, full_name, email, phone)
  VALUES (v_user_id, p_pharmacy_id, p_full_name, p_email, p_phone)
  RETURNING * INTO v_owner;

  RETURN v_owner;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_owner(uuid, text, text, text, text) TO authenticated;

-- تغيير كلمة مرور المالك (تحديث حساب Supabase Auth نفسه)
CREATE OR REPLACE FUNCTION public.reset_owner_password(p_owner_id uuid, p_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'غير مصرح لك';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'كلمة المرور يجب ألا تقل عن 6 أحرف';
  END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now()
  WHERE id = p_owner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_owner_password(uuid, text) TO authenticated;

-- تفعيل / تعطيل حساب المالك
CREATE OR REPLACE FUNCTION public.set_owner_active(p_owner_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'غير مصرح لك';
  END IF;
  UPDATE public.pharmacy_owners SET is_active = p_active, updated_at = now() WHERE id = p_owner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_owner_active(uuid, boolean) TO authenticated;

-- حذف حساب المالك نهائياً (من Supabase Auth + صفه في pharmacy_owners تلقائياً)
CREATE OR REPLACE FUNCTION public.delete_owner(p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_site_admin() THEN
    RAISE EXCEPTION 'غير مصرح لك';
  END IF;
  DELETE FROM auth.users WHERE id = p_owner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_owner(uuid) TO authenticated;

-- إعادة تحميل مخطط PostgREST حتى تظهر الدوال الجديدة فوراً
NOTIFY pgrst, 'reload schema';
