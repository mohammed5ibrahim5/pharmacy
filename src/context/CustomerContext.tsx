import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';

// ===== ┘ê╪╢╪╣ ╪ز╪ش╪▒┘è╪ذ┘è ┘┘â┘ê╪» ╪د┘╪ز╪ص┘é┘é (OTP) ╪ذ╪»┘ê┘ ╪ح╪▒╪│╪د┘ SMS ╪ص┘é┘è┘é┘è =====
// ╪د┘┘â┘ê╪» ┘è╪╕┘ç╪▒ ╪»╪د╪«┘ ╪د┘╪ز╪╖╪ذ┘è┘é╪î ┘ê╪د┘╪ز╪ص┘é┘é ┘è┘╪╣┘ّ┘ ╪ش┘╪│╪ر Supabase ╪ص┘é┘è┘é┘è╪ر (Anonymous).
const DEMO_OTP_ENABLED = import.meta.env.VITE_DEMO_OTP === 'true';
const demoOtpStore = new Map<string, string>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isRateLimitError(message: string | null | undefined): boolean {
  return !!message && /rate limit|too many requests|429|for security purposes|email rate limit|over_request_rate_limit/i.test(message);
}

// ╪╣┘╪» ╪ز╪ش╪د┘ê╪▓ ╪╣╪»╪» ╪د┘┘à╪ص╪د┘ê┘╪د╪ز: ┘┘╪ز╪╕╪▒ ┘ê┘╪ص╪د┘ê┘ ╪ز┘┘é╪د╪خ┘è╪د┘ï ╪ذ╪»┘ ╪ح╪╕┘ç╪د╪▒ ╪د┘╪«╪╖╪ث ┘┘┘à╪│╪ز╪«╪»┘à ┘┘ê╪▒╪د┘ï
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

    // ╪د┘╪ش┘╪│╪ر ╪د┘╪ص┘é┘è┘é┘è╪ر ┘┘é╪╖ ┘ç┘è ┘à┘ ╪ز╪╣╪ز╪ذ╪▒ ╪د┘┘à╪│╪ز╪«╪»┘à ┘à╪│╪ش┘╪د┘ï ظ¤ ┘╪د ╪ص╪│╪د╪ذ╪د╪ز ┘à╪ص┘┘è╪ر ┘ê┘ç┘à┘è╪ر
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
      // ╪د┘╪»╪«┘ê┘ ╪ذ╪د┘╪▒┘é┘à: ┘╪ذ╪ص╪س ╪╣┘ ╪د┘╪ذ╪▒┘è╪» ╪د┘┘à╪▒╪ز╪ذ╪╖ ╪ذ╪د┘╪▒┘é┘à ┘┘è ┘é╪د╪╣╪»╪ر ╪د┘╪ذ┘è╪د┘╪د╪ز ┘ê┘╪│╪ش┘ ╪»╪«┘ê┘ ╪ص┘é┘è┘é┘è (┘è╪╣┘à┘ ┘à┘ ╪ث┘è ╪ش┘ç╪د╪▓)
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
    if (DEMO_OTP_ENABLED) {
      const normPhone = phone ? normalizeEgyptianPhone(phone) : null;
      const [dupEmail, dupPhone] = await Promise.all([
        supabase.rpc('customer_email_exists', { p_email: normalizedEmail }),
        normPhone
          ? supabase.rpc('customer_phone_exists', { p_phone: normPhone })
          : Promise.resolve({ data: false }),
      ]);
      if (dupEmail.data) return { error: '┘ç╪░╪د ╪د┘╪ذ╪▒┘è╪» ╪د┘╪ح┘┘â╪ز╪▒┘ê┘┘è ┘à╪│╪ش┘ ╪ذ╪ص╪│╪د╪ذ ╪ت╪«╪▒╪î ┘è┘à┘â┘┘â ╪ز╪│╪ش┘è┘ ╪د┘╪»╪«┘ê┘ ╪ذ╪»┘╪د┘ï ┘à┘ ╪ح┘╪┤╪د╪ة ╪ص╪│╪د╪ذ ╪ش╪»┘è╪»' };
      if (dupPhone.data) return { error: '╪▒┘é┘à ╪د┘┘ç╪د╪ز┘ ┘à╪│╪ش┘ ╪ذ╪ص╪│╪د╪ذ ╪ت╪«╪▒╪î ┘è┘à┘â┘┘â ╪ز╪│╪ش┘è┘ ╪د┘╪»╪«┘ê┘ ╪ذ╪»┘╪د┘ï ┘à┘ ╪ح┘╪┤╪د╪ة ╪ص╪│╪د╪ذ ╪ش╪»┘è╪»' };
      // ╪ح┘╪┤╪د╪ة ╪ص╪│╪د╪ذ Auth ╪ص┘é┘è┘é┘è ╪ص╪ز┘ë ┘è╪╣┘à┘ ╪ز╪│╪ش┘è┘ ╪د┘╪»╪«┘ê┘ ╪ذ╪د┘╪▒┘é┘à ╪ث┘ê ╪د┘╪ح┘è┘à┘è┘ ┘à┘ ╪ث┘è ╪ش┘ç╪د╪▓
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
          // ╪د┘╪ص╪│╪د╪ذ ┘à┘ê╪ش┘ê╪» ┘┘è Auth ┘à┘ ┘é╪ذ┘: ┘╪ش╪▒╪ذ ╪د┘╪»╪«┘ê┘ ┘à╪ذ╪د╪┤╪▒╪ر ╪ذ┘┘╪│ ┘â┘┘à╪ر ╪د┘┘à╪▒┘ê╪▒
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
          return { error: '┘ç╪░╪د ╪د┘╪ذ╪▒┘è╪» ╪د┘╪ح┘┘â╪ز╪▒┘ê┘┘è ┘à╪│╪ش┘ ╪ذ┘â┘┘à╪ر ┘à╪▒┘ê╪▒ ┘à╪«╪ز┘┘╪ر╪î ╪ذ╪▒╪ش╪د╪ة ╪ز╪│╪ش┘è┘ ╪د┘╪»╪«┘ê┘' };
        }
        return { error: localizedError(signUpErr.message, 'ar') };
      }
      if (!signUpData.session) {
        // ┘┘ê ╪ز╪ث┘â┘è╪» ╪د┘╪ذ╪▒┘è╪» ╪║┘è╪▒ ┘à┘╪╣┘ّ┘ ╪╣┘┘ë ╪د┘╪«╪د╪»┘à ┘┘é╪»╪▒ ┘╪»╪«┘ ┘à╪ذ╪د╪┤╪▒╪ر
        const { error: directErr } = await withRateLimitRetry(() =>
          supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          })
        );
        if (directErr) {
          return { error: '╪ز┘à ╪ح┘╪┤╪د╪ة ╪د┘╪ص╪│╪د╪ذ. ╪ذ╪▒╪ش╪د╪ة ╪ز╪ث┘â┘è╪» ╪ذ╪▒┘è╪»┘â ╪د┘╪ح┘┘â╪ز╪▒┘ê┘┘è ┘à┘ ╪د┘╪▒╪│╪د┘╪ر ╪د┘┘à╪▒╪│┘╪ر ╪س┘à ╪ز╪│╪ش┘è┘ ╪د┘╪»╪«┘ê┘.' };
        }
        await refreshProfile();
        return { error: null };
      }
      // ╪د┘╪ش┘╪│╪ر ╪ش╪د┘ç╪▓╪ر ظ¤ ╪د┘┘ trigger ╪╣┘┘ë auth.users ╪ث┘╪┤╪ث ╪╡┘ ╪د┘╪╣┘à┘è┘ ╪ز┘┘é╪د╪خ┘è╪د┘ï╪î ┘╪ص╪»┘ّ╪س ╪ذ┘è╪د┘╪د╪ز┘ç ┘┘é╪╖
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
      return { error: '╪ز┘à ╪ح┘╪┤╪د╪ة ╪د┘╪ص╪│╪د╪ذ. ╪ذ╪▒╪ش╪د╪ة ╪ز╪ث┘â┘è╪» ╪ذ╪▒┘è╪»┘â ╪د┘╪ح┘┘â╪ز╪▒┘ê┘┘è ┘à┘ ╪د┘╪▒╪│╪د┘╪ر ╪د┘┘à╪▒╪│┘╪ر ╪س┘à ╪ز╪│╪ش┘è┘ ╪د┘╪»╪«┘ê┘.' };
    }
    await refreshProfile();
    return { error: null };
  };

  const normalizeEgyptianPhone = (phone: string): string => {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('002')) digits = digits.slice(3);
  else if (digits.startsWith('20') && digits.length === 12) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `+20${digits}`;
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
      if (!uid) {
        return { error: '╪ز╪╣╪░╪▒ ╪ذ╪»╪ة ╪ش┘╪│╪ر ╪د┘╪ز╪ص┘é┘é╪î ╪ذ╪▒╪ش╪د╪ة ╪د┘┘à╪ص╪د┘ê┘╪ر ┘à╪▒╪ر ╪ث╪«╪▒┘ë', instant: false };
      }
      // ╪▒╪ذ╪╖ ╪د┘╪▒┘é┘à ╪ذ╪╡┘ ╪د┘╪╣┘à┘è┘ ╪د┘╪«╪د╪╡ ╪ذ┘ç╪░┘ç ╪د┘╪ش┘╪│╪ر (╪د┘┘ trigger ┘è┘╪┤╪خ┘ç ╪ز┘┘é╪د╪خ┘è╪د┘ï ╪╣┘╪» ╪د┘╪ص╪د╪ش╪ر)
      const { error: linkErr } = await supabase
        .from('customers')
        .update({ phone: normPhone })
        .eq('user_id', uid);
      if (linkErr) {
        return { error: localizedError(linkErr.message, 'ar'), instant: false };
      }
      await refreshProfile();
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
        return { error: '┘â┘ê╪» ╪د┘╪ز╪ص┘é┘é ╪║┘è╪▒ ╪╡╪ص┘è╪ص' };
      }
      demoOtpStore.delete(phone.replace(/\D/g, ''));
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error) {
          return { error: '╪ز╪╣╪░╪▒ ╪ح┘â┘à╪د┘ ╪د┘╪ز╪ص┘é┘é╪î ╪ذ╪▒╪ش╪د╪ة ╪د┘┘à╪ص╪د┘ê┘╪ر ┘à╪▒╪ر ╪ث╪«╪▒┘ë' };
        }
      }
      const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
      if (!uid) {
        return { error: '╪ز╪╣╪░╪▒ ╪ح┘â┘à╪د┘ ╪د┘╪ز╪ص┘é┘é╪î ╪ذ╪▒╪ش╪د╪ة ╪د┘┘à╪ص╪د┘ê┘╪ر ┘à╪▒╪ر ╪ث╪«╪▒┘ë' };
      }
      await supabase
        .from('customers')
        .update({ phone: normalizeEgyptianPhone(phone) })
        .eq('user_id', uid);
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
    if (!user?.id) return { error: '╪║┘è╪▒ ┘à╪│╪ش┘ ╪»╪«┘ê┘' };
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
