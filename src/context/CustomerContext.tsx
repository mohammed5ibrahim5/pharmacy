import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface CustomerProfile {
  id: string;
  user_id?: string | null;
  full_name: string | null;
  phone: string | null;
  email: string;
  avatar_url: string | null;
  password_hash?: string | null;
}

interface CustomerContextType {
  user: CustomerProfile | null;
  profile: CustomerProfile | null;
  loading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string, avatarUrl?: string | null) => Promise<{ error: string | null }>;
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
  signOut: async () => {},
  refreshProfile: async () => {},
  updateProfile: async () => ({ error: null }),
});

// Simple hash function (not for real security, just for demo)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(36) + '_' + str.length;
}

const SESSION_KEY = 'pharmacy_customer_session';

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerProfile | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchProfileById = async (userId: string) => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    const p = data as CustomerProfile | null;
    if (p) {
      setProfile(p);
      setUser(p);
    }
    return p;
  };

  useEffect(() => {
    // Restore session from localStorage
    const restore = async () => {
      const sessionId = localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        await fetchProfileById(sessionId);
      }
      setLoading(false);
    };
    restore();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
if (error) {
      return { error: error.message };
    }
    if (!data) {
      return { error: 'لا يوجد حساب بهذا البريد الإلكتروني' };
    }
    const customer = data as CustomerProfile;
    if (!customer.password_hash) {
      return { error: 'هذا الحساب لا يدعم تسجيل الدخول المباشر' };
    }
    if (customer.password_hash !== simpleHash(password)) {
      return { error: 'كلمة المرور غير صحيحة' };
    }
    localStorage.setItem(SESSION_KEY, customer.id);
    await fetchProfileById(customer.id);
    return { error: null };
  };

const signUp = async (email: string, password: string, fullName: string, phone?: string, avatarUrl?: string | null) => {
    const normalizedEmail = email.toLowerCase().trim();
    // Check if email already exists
    const { data: existing, error: existingError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
if (existing) {
      return { error: 'هذا البريد الإلكتروني مسجل بالفعل، برجاء تسجيل الدخول' };
    }
    if (existingError) {
      return { error: existingError.message };
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        full_name: fullName,
        phone: phone || null,
        email: normalizedEmail,
        avatar_url: avatarUrl || null,
        password_hash: simpleHash(password),
      })
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      return { error: error.message };
    }
    const customer = data as CustomerProfile;
    localStorage.setItem(SESSION_KEY, customer.id);
    await fetchProfileById(customer.id);
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfileById(user.id);
    }
  };

  const updateProfile = async (updates: Partial<CustomerProfile>) => {
    if (!user?.id) return { error: 'غير مسجل دخول' };
    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', user.id);
if (!error) {
      await fetchProfileById(user.id);
    }
    return { error: error ? error.message : null };
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
