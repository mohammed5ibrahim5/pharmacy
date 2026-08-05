-- ============================================
-- جدول العملاء (Customers / Profiles)
-- ============================================
-- نظام مصادقة مخصص (بدون Supabase Auth) لتجنب Rate limits
-- يخزن بيانات العملاء: الاسم، الصورة، رقم الهاتف، البريد، كلمة المرور (مشفرة)

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text UNIQUE,
  avatar_url text,
  password_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- السماح لأي شخص (حتى غير مسجل) بإنشاء حساب جديد
DROP POLICY IF EXISTS "customer_public_insert" ON customers;
CREATE POLICY "customer_public_insert" ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- السماح لأي شخص بالبحث عن بريده للتحقق من تسجيل الدخول
DROP POLICY IF EXISTS "customer_public_select" ON customers;
CREATE POLICY "customer_public_select" ON customers FOR SELECT
  TO anon, authenticated
  USING (true);

-- السماح للمستخدم بتحديث صفه
DROP POLICY IF EXISTS "customer_update_own" ON customers;
CREATE POLICY "customer_update_own" ON customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- السماح للمستخدم بحذف صفه
DROP POLICY IF EXISTS "customer_delete_own" ON customers;
CREATE POLICY "customer_delete_own" ON customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- معالج تلقائي: إنشاء صف عميل عند إنشاء مستخدم جديد (للمستخدمين القدامى)
CREATE OR REPLACE FUNCTION handle_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_customer();

