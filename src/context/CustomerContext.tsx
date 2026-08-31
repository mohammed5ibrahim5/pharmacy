import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRateLimitError(message: string | null | undefined): boolean {
  return !!message && /rate limit|too many requests|429|for security purposes|email rate limit|over_request_rate_limit/i.test(message);
}

// عند تجاوز عدد المحاولات: ننتظر ونحاول تلقائياً بدل إظهار الخطأ للمستخدم فوراً
async function withRateLimitRetry<R extends { error?: { message?: string } | null }>(
  fn: () => Promise<R>,
  maxAttempts = 3
): Promise<R> {
  let result = await fn();
  let attempt = 1;
  while (result?.error?.message && isRateLimitError(result.error.message) && attempt < maxAttempts) {
    await sleep(attempt * 4000);
    attempt += 1;
    result = await fn();
  }
  return result;
}

export interface CustomerProfile {
  id: string;
  user_id?: string | null;
  full_name: string | null;
  phone: string | null;
  email: string;
  avatar_url: string | null;
  password_hash?: string | null;
  loyalty_points?: number;
  created_at?: string;
}

interface CustomerContextType {
  user: CustomerProfile | null;
  profile: CustomerProfile | null;
  loading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string, avatarUrl?: string | null) => Promise<{ error: string | null }>;
  sendOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<CustomerProfile>) => Promise<{ error: string | null }>;
}

const CustomerContext = createContext<CustomerContextType>({
  user: null,
  profile: null,
  loading: true,
  authModalOpen: false,
  setAuthModalOpen: () => {},
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  sendOtp: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => ({ error: null }),
});

function normalizeEgyptianPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('002')) digits = digits.slice(3);
  else if (digits.startsWith('20') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `+20${digits}`;
}

async function fetchProfile(): Promise<CustomerProfile | null> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return null;
  const { data: row } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();
  return (row as CustomerProfile | null) || null;
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    // الجلسة الحقيقية فقط هي من تعتبر المستخدم مسجلاً — لا حسابات محلية وهمية
    const hydrate = async (uid?: string) => {
      if (!uid) return;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (!active) return;
      const p = (data as CustomerProfile | null) || null;
      setProfile(p);
      setUser(p);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        hydrate(data.session.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setUser(null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        hydrate(session.user.id);
      } else {
        setProfile(null);
        setUser(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const p = await fetchProfile();
    setProfile(p);
    setUser(p);
  };

  const signIn = async (identifier: string, password: string) => {
    const input = identifier.trim();
    const digits = input.replace(/\D/g, '');
    const isPhone = input.startsWith('+') || /^(01[0125])/.test(input) || digits.length >= 10;
    if (!isPhone) {
      const { error } = await withRateLimitRetry(() =>
        supabase.auth.signInWithPassword({
          email: input.toLowerCase(),
          password,
        })
      );
      if (!error) {
        await refreshProfile();
        return { error: null };
      }
    } else {
      // الدخول بالرقم: نبحث عن البريد المرتبط بالرقم في قاعدة البيانات ونسجل دخول حقيقي (يعمل من أي جهاز)
      const normPhone = normalizeEgyptianPhone(input);
      const { data: row } = await supabase
        .from('customers')
        .select('email')
        .eq('phone', normPhone)
        .maybeSingle();
      const linkedEmail = (row as { email?: string | null } | null)?.email?.toLowerCase();
      if (linkedEmail) {
        const { error } = await withRateLimitRetry(() =>
          supabase.auth.signInWithPassword({
            email: linkedEmail,
            password,
          })
        );
        if (!error) {
          await refreshProfile();
          return { error: null };
        }
      }
    }
    return { error: localizedError('Invalid login credentials', 'ar') };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string, avatarUrl?: string | null) => {
    const normalizedEmail = email.toLowerCase().trim();
    const normPhone = phone ? normalizeEgyptianPhone(phone) : null;
    const [dupEmail, dupPhone] = await Promise.all([
      supabase.rpc('customer_email_exists', { p_email: normalizedEmail }),
      normPhone
        ? supabase.rpc('customer_phone_exists', { p_phone: normPhone })
        : Promise.resolve({ data: false }),
    ]);
      if (dupEmail.data) return { error: 'هذا البريد الإلكتروني مسجل بحساب آخر، يمكنك تسجيل الدخول بدلاً من إنشاء حساب جديد' };
      if (dupPhone.data) return { error: 'رقم الهاتف مسجل بحساب آخر، يمكنك تسجيل الدخول بدلاً من إنشاء حساب جديد' };
      // إنشاء حساب Auth حقيقي حتى يعمل تسجيل الدخول بالرقم أو الإيميل من أي جهاز
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) await supabase.auth.signOut();
      const { data: signUpData, error: signUpErr } = await withRateLimitRetry(() =>
        supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: normPhone,
              avatar_url: avatarUrl || null,
            },
          },
        })
      );
      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered')) {
          // الحساب موجود في Auth من قبل: نجرب الدخول مباشرة بنفس كلمة المرور
          const { error: signInErr } = await withRateLimitRetry(() =>
            supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            })
          );
          if (!signInErr) {
            await refreshProfile();
            return { error: null };
          }
          return { error: 'هذا البريد الإلكتروني مسجل بكلمة مرور مختلفة، برجاء تسجيل الدخول' };
        }
        return { error: localizedError(signUpErr.message, 'ar') };
      }
      if (!signUpData.session) {
        // لو تأكيد البريد غير مفعّل على الخادم نقدر ندخل مباشرة
        const { error: directErr } = await withRateLimitRetry(() =>
          supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
        );
        if (directErr) {
          return { error: 'تم إنشاء الحساب. برجاء تأكيد بريدك الإلكتروني من الرسالة المرسلة ثم تسجيل الدخول.' };
        }
        await refreshProfile();
        return { error: null };
      }
      // الجلسة جاهزة — الـ trigger على auth.users أنشأ صف العميل تلقائياً، نحدّث بياناته فقط
      const uid = signUpData.user?.id ?? null;
      if (!uid) return { error: localizedError('Signup failed', 'ar') };
      const p = await fetchProfile();
      if (p) {
        const updates: Record<string, unknown> = {
          full_name: fullName,
          email: normalizedEmail,
          phone: normPhone,
        };
        if (avatarUrl && !avatarUrl.startsWith('data:')) updates.avatar_url = avatarUrl;
        await supabase.from('customers').update(updates).eq('user_id', uid);
      }
      await refreshProfile();
      return { error: null };
  };

  const sendOtp = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizeEgyptianPhone(phone),
    });
    if (error) return { error: localizedError(error.message, 'ar') };
    return { error: null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizeEgyptianPhone(phone),
      token: token.trim(),
      type: 'sms',
    });
    if (error) return { error: localizedError(error.message, 'ar') };
    await refreshProfile();
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<CustomerProfile>) => {
    if (!user?.id) return { error: 'غير مسجل دخول' };
    const rest = { ...updates };
    delete rest.email;
    delete rest.password_hash;
    const { error } = await supabase
      .from('customers')
      .update(rest)
      .eq('user_id', user.id);
    if (!error) {
      await refreshProfile();
    }
    return { error: error ? localizedError(error.message, 'ar') : null };
  };

  return (
    <CustomerContext.Provider
      value={{
        user,
        profile,
        loading,
        authModalOpen,
        setAuthModalOpen,
        signIn,
        signUp,
        sendOtp,
        verifyOtp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  return useContext(CustomerContext);
}
