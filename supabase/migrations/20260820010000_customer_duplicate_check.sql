-- ============================================
-- كشف تكرار رقم الهاتف / البريد عند إنشاء الحساب
-- (يعمل حتى للمستخدمين غير المسجلين عبر SECURITY DEFINER
--  بدون كشف أي بيانات شخصية)
-- ============================================

-- تطبيع الرقم: أرقام فقط + آخر 10 أرقام (الشكل الوطني للموبايل المصري)
CREATE OR REPLACE FUNCTION public.phone_digits(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN length(regexp_replace(p, '\D', '', 'g')) >= 10
    THEN right(regexp_replace(p, '\D', '', 'g'), 10)
    ELSE NULL
  END
$$;

-- فحص وجود رقم الهاتف (يتجاوز RLS للقراءة فقط)
CREATE OR REPLACE FUNCTION public.customer_phone_exists(p_phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE phone IS NOT NULL AND phone <> ''
      AND public.phone_digits(phone) = public.phone_digits(p_phone)
  )
$$;

-- فحص وجود البريد الإلكتروني (يتجاوز RLS للقراءة فقط)
CREATE OR REPLACE FUNCTION public.customer_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE lower(email) = lower(p_email)
  )
$$;

REVOKE ALL ON FUNCTION public.customer_phone_exists(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_email_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_phone_exists(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_email_exists(text) TO anon, authenticated;