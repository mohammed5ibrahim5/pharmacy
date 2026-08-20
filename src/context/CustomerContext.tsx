import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';

// ===== الوضع التجريبي للدخول بالرقم (بدون إرسال SMS حقيقي) =====
// عند التفعيل: يظهر الكود جوه التطبيق، ويفعّل حساب فضفضة (Anonymous) عند التأكيد.
// عند الإطلاق الحقيقي: حول القيمة لـ false واستخدم Supabase Phone Auth.
const DEMO_OTP_ENABLED = true;
const demoOtpStore = new Map<string, string>();
const LOCAL_PROFILE_KEY = 'pharmacy_demo_profile_v1';
const LOCAL_CREDS_KEY = 'pharmacy_demo_creds_v1';
const LOCAL_USER_ID = 'local-demo';

interface DemoCreds {
  email: string;
  phone: string;
  password: string;
  full_name: string | null;
  avatar_url: string | null;
}

function readDemoCreds(): DemoCreds | null {
  try {
    const raw = localStorage.getItem(LOCAL_CREDS_KEY);
    return raw ? (JSON.parse(raw) as DemoCreds) : null;
  } catch {
    return null;
  }
}

function writeDemoCreds(c: DemoCreds) {
  localStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(c));
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
  sendOtp: (phone: string) => Promise<{ error: string | null; debugCode?: string | null; instant?: boolean }>;
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
      if (p) {
        setProfile(p);
        setUser(p);
      } else {
        const localP = loadLocalProfile();
        if (localP) {
          setProfile(localP);
          setUser(localP);
        } else {
          setProfile(null);
          setUser(null);
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) {
        hydrate(data.session.user.id).finally(() => setLoading(false));
      } else {
        const localP = loadLocalProfile();
        if (localP) {
          setProfile(localP);
          setUser(localP);
        }
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
      const { error } = await supabase.auth.signInWithPassword({
        email: input.toLowerCase(),
        password,
      });
      if (!error) {
        await refreshProfile();
        return { error: null };
      }
    }
    const creds = readDemoCreds();
    if (!creds) return { error: localizedError('Invalid login credentials', 'ar') };
    const phoneMatch = isPhone ? creds.phone === normalizeEgyptianPhone(input) : false;
    const emailMatch = !isPhone ? creds.email.toLowerCase() === input.toLowerCase() : false;
    if (creds.password !== password || !(phoneMatch || emailMatch)) {
      return { error: 'بيانات الدخول غير صحيحة' };
    }
    saveLocalProfile({
      id: LOCAL_USER_ID,
      user_id: LOCAL_USER_ID,
      full_name: creds.full_name,
      email: creds.email,
      phone: creds.phone,
      avatar_url: creds.avatar_url,
    });
    return { error: null };
  };

  const loadLocalProfile = (): CustomerProfile | null => {
    try {
      const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
      return raw ? (JSON.parse(raw) as CustomerProfile) : null;
    } catch {
      return null;
    }
  };

  const saveLocalProfile = (p: CustomerProfile) => {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
    setUser(p);
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string, avatarUrl?: string | null) => {
    const normalizedEmail = email.toLowerCase().trim();
    if (DEMO_OTP_ENABLED) {
      const normPhone = phone ? normalizeEgyptianPhone(phone) : null;
      const [dupEmail, dupPhone] = await Promise.all([
        supabase.from('customers').select('id').eq('email', normalizedEmail).maybeSingle(),
        normPhone
          ? supabase.from('customers').select('id').eq('phone', normPhone).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (dupEmail.data) return { error: 'هذا البريد الإلكتروني مستخدم بالفعل' };
      if (dupPhone.data) return { error: 'رقم الهاتف مستخدم بالفعل' };
      writeDemoCreds({
        email: normalizedEmail,
        phone: normPhone ?? '',
        password,
        full_name: fullName,
        avatar_url: avatarUrl ?? null,
      });
      const { data: sessionData } = await supabase.auth.getSession();
      let uid = sessionData.session?.user?.id ?? null;
      if (!uid) {
        const res = await supabase.auth.signInAnonymously();
        uid = res.error ? null : (res.data?.user?.id ?? null);
      }
      if (uid) {
        const updates: Record<string, unknown> = {
          full_name: fullName,
          email: normalizedEmail,
          phone: normPhone,
        };
        if (avatarUrl) updates.avatar_url = avatarUrl;
        const { data: upd } = await supabase
          .from('customers')
          .update(updates)
          .eq('user_id', uid)
          .select();
        if (!upd || upd.length === 0) {
          const { error: upsErr } = await supabase
            .from('customers')
            .upsert({ id: uid, user_id: uid, ...updates }, { onConflict: 'user_id' });
          if (upsErr) {
            saveLocalProfile({
              id: LOCAL_USER_ID,
              user_id: LOCAL_USER_ID,
              full_name: fullName,
              email: normalizedEmail,
              phone: normPhone,
              avatar_url: avatarUrl ?? null,
            });
            return { error: null };
          }
        }
        await refreshProfile();
        const p = await fetchProfile();
        if (!p) {
          saveLocalProfile({
            id: LOCAL_USER_ID,
            user_id: LOCAL_USER_ID,
            full_name: fullName,
            email: normalizedEmail,
            phone: normPhone,
            avatar_url: avatarUrl ?? null,
          });
        }
        return { error: null };
      }
      saveLocalProfile({
        id: LOCAL_USER_ID,
        user_id: LOCAL_USER_ID,
        full_name: fullName,
        email: normalizedEmail,
        phone: normPhone,
        avatar_url: avatarUrl ?? null,
      });
      return { error: null };
    }
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
      const normPhone = normalizeEgyptianPhone(phone);
      const { data: sessionData } = await supabase.auth.getSession();
      let uid = sessionData.session?.user?.id ?? null;
      if (!uid) {
        const res = await supabase.auth.signInAnonymously();
        uid = res.error ? null : (res.data?.user?.id ?? null);
      }
      if (uid) {
        const { data: upd } = await supabase
          .from('customers')
          .update({ phone: normPhone })
          .eq('user_id', uid)
          .select();
        if (!upd || upd.length === 0) {
          const { error: upsErr } = await supabase
            .from('customers')
            .upsert({ id: uid, user_id: uid, phone: normPhone }, { onConflict: 'user_id' });
          if (upsErr) {
            const prev = loadLocalProfile();
            saveLocalProfile({
              id: LOCAL_USER_ID,
              user_id: LOCAL_USER_ID,
              full_name: prev?.full_name ?? null,
              email: prev?.email ?? '',
              phone: normPhone,
              avatar_url: prev?.avatar_url ?? null,
            });
            return { error: null, instant: true };
          }
        }
        await refreshProfile();
        const p = await fetchProfile();
        if (!p) {
          const prev = loadLocalProfile();
          saveLocalProfile({
            id: LOCAL_USER_ID,
            user_id: LOCAL_USER_ID,
            full_name: prev?.full_name ?? null,
            email: prev?.email ?? '',
            phone: normPhone,
            avatar_url: prev?.avatar_url ?? null,
          });
        }
        return { error: null, instant: true };
      }
      const prev = loadLocalProfile();
      saveLocalProfile({
        id: LOCAL_USER_ID,
        user_id: LOCAL_USER_ID,
        full_name: prev?.full_name ?? null,
        email: prev?.email ?? '',
        phone: normPhone,
        avatar_url: prev?.avatar_url ?? null,
      });
      return { error: null, instant: true };
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
          .eq('user_id', uid);
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
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    setProfile(null);
    setUser(null);
  };

  const updateProfile = async (updates: Partial<CustomerProfile>) => {
    if (!user?.id) return { error: 'غير مسجل دخول' };
    const rest = { ...updates };
    delete rest.email;
    delete rest.password_hash;
    if (user.id === LOCAL_USER_ID) {
      saveLocalProfile({ ...user, ...rest });
      return { error: null };
    }
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