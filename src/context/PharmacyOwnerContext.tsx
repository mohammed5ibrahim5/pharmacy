import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Pharmacy, PharmacyOwner } from '@/types';
import { fetchOwnerByUserId, fetchPharmacy, loginOwner, signOutOwner } from '@/lib/ownerAuth';

interface PharmacyOwnerContextType {
  owner: PharmacyOwner | null;
  pharmacy: Pharmacy | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setPharmacy: (p: Pharmacy | null) => void;
}

const PharmacyOwnerContext = createContext<PharmacyOwnerContextType>({
  owner: null,
  pharmacy: null,
  loading: true,
  login: async () => ({ error: null }),
  logout: async () => {},
  refresh: async () => {},
  setPharmacy: () => {},
});

export function PharmacyOwnerProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<PharmacyOwner | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFromSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setOwner(null);
      setPharmacy(null);
      return;
    }
    const o = await fetchOwnerByUserId(session.user.id);
    if (!o) {
      setOwner(null);
      setPharmacy(null);
      return;
    }
    setOwner(o);
    setPharmacy(await fetchPharmacy(o.pharmacy_id));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      loadFromSession(data.session).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadFromSession(session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadFromSession]);

  const login = async (email: string, password: string) => {
    const result = await loginOwner(email, password);
    if (result.error) return { error: result.error };
    setOwner(result.owner);
    setPharmacy(result.pharmacy);
    return { error: null };
  };

  const logout = async () => {
    await signOutOwner();
    setOwner(null);
    setPharmacy(null);
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    await loadFromSession(data.session);
  };

  return (
    <PharmacyOwnerContext.Provider
      value={{ owner, pharmacy, loading, login, logout, refresh, setPharmacy }}
    >
      {children}
    </PharmacyOwnerContext.Provider>
  );
}

export function usePharmacyOwner() {
  return useContext(PharmacyOwnerContext);
}
