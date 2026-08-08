import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Pharmacy, PharmacyOwner } from '@/types';
import {
  clearOwnerSession,
  fetchOwner,
  fetchPharmacy,
  getOwnerSessionId,
  loginOwner,
} from '@/lib/ownerAuth';

interface PharmacyOwnerContextType {
  owner: PharmacyOwner | null;
  pharmacy: Pharmacy | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  refresh: () => Promise<void>;
  setPharmacy: (p: Pharmacy | null) => void;
}

const PharmacyOwnerContext = createContext<PharmacyOwnerContextType>({
  owner: null,
  pharmacy: null,
  loading: true,
  login: async () => ({ error: null }),
  logout: () => {},
  refresh: async () => {},
  setPharmacy: () => {},
});

export function PharmacyOwnerProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<PharmacyOwner | null>(null);
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (ownerId: string) => {
    const o = await fetchOwner(ownerId);
    if (!o) {
      clearOwnerSession();
      setOwner(null);
      setPharmacy(null);
      return;
    }
    setOwner(o);
    const p = await fetchPharmacy(o.pharmacy_id);
    setPharmacy(p);
    if (!p) clearOwnerSession();
  };

  useEffect(() => {
    const sessionId = getOwnerSessionId();
    if (!sessionId) {
      setLoading(false);
      return;
    }
    load(sessionId).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const result = await loginOwner(email, password);
    if (result.error) return { error: result.error };
    setOwner(result.owner);
    setPharmacy(result.pharmacy);
    return { error: null };
  };

  const logout = () => {
    clearOwnerSession();
    setOwner(null);
    setPharmacy(null);
  };

  const refresh = async () => {
    if (owner?.id) {
      await load(owner.id);
    }
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
