import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';

// ===== الوضع التجريبي للدخول بالرقم (بدون إرسال SMS حقيقي) =====
// عند التفعيل: يظهر الكود جوه التطبيق، ويفعّل حساب فضفضة (Anonymous) عند التأكيد.
// عند الإطلاق الحقيقي: حول القيمة لـ false واستخدم Supabase Phone Auth.
const DEMO_OTP_ENABLED = true;
const demoOtpStore = new Map<string, string>();

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
  sendOtp: (phone: string) => Promise<{ error: string | null; debugCode?: string | null }>;
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (error) return { error: localizedError(error.message, 'ar') };
    await refreshProfile();
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string, avatarUrl?: string | null) => {
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          avatar_url: avatarUrl || null,
        },
      },
    });
    if (error) return { error: localizedError(error.message, 'ar') };

    if (data.session) {
      await refreshProfile();
      return { error: null };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInError) {
      return { error: 'تم إنشاء الحساب. برجاء تأكيد بريدك الإلكتروني من الرسالة المرسلة ثم تسجيل الدخول.' };
    }
    await refreshProfile();
    return { error: null };
  };

  const normalizeEgyptianPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('002')) return `+${digits.slice(3)}`;
  if (digits.startsWith('01') && digits.length === 11) return `+2${digits.slice(1)}`;
  if (!digits.startsWith('+')) return `+${digits}`;
  return digits;
};

  const sendOtp = async (phone: string) => {
    if (DEMO_OTP_ENABLED) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      demoOtpStore.set(phone.replace(/\D/g, ''), code);
      return { error: null, debugCode: code };
    }
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizeEgyptianPhone(phone),
    });
    if (error) return { error: localizedError(error.message, 'ar') };
    return { error: null };
  };

  const verifyOtp = async (phone: string, token: string) => {
    if (DEMO_OTP_ENABLED) {
      const expected = demoOtpStore.get(phone.replace(/\D/g, ''));
      if (!expected || expected !== token.trim()) {
        return { error: 'كود التحقق غير صحيح' };
      }
      demoOtpStore.delete(phone.replace(/\D/g, ''));
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        return { error: 'التسجيل التجريبي يتطلب تفعيل "Anonymous sign-in" في إعدادات Supabase Auth.' };
      }
      const uid = data?.user?.id;
      if (uid) {
        await supabase
          .from('customers')
          .update({ phone: normalizeEgyptianPhone(phone) })
          .eq('id', uid);
      }
      await refreshProfile();
      return { error: null };
    }
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
      .eq('id', user.id);
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