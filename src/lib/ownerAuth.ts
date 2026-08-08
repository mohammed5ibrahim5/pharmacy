import { supabase } from '@/lib/supabase';
import type { Pharmacy, PharmacyOwner } from '@/types';

export const OWNER_SESSION_KEY = 'pharmacy_owner_session';

// Simple hash function (demo only — same approach as customer accounts)
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(36) + '_' + str.length;
}

export function getOwnerSessionId(): string | null {
  return localStorage.getItem(OWNER_SESSION_KEY);
}

export function setOwnerSession(ownerId: string) {
  localStorage.setItem(OWNER_SESSION_KEY, ownerId);
}

export function clearOwnerSession() {
  localStorage.removeItem(OWNER_SESSION_KEY);
}

export async function loginOwner(
  email: string,
  password: string
): Promise<{ owner: PharmacyOwner | null; pharmacy: Pharmacy | null; error: string | null }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !password) {
    return { owner: null, pharmacy: null, error: 'برجاء إدخال البريد الإلكتروني وكلمة المرور' };
  }
  const { data, error } = await supabase
    .from('pharmacy_owners')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    const isMissingTable = /could not find the table|could not find the function|does not exist|relation .* not found/i.test(error.message);
    return {
      owner: null,
      pharmacy: null,
      error: isMissingTable
        ? 'جدول أصحاب الصيدليات غير موجود — شغّل ملف المايجرشن supabase/migrations/20260808100000_pharmacy_owners.sql في Supabase SQL Editor'
        : error.message,
    };
  }
  if (!data) {
    return { owner: null, pharmacy: null, error: 'لا يوجد حساب مالك بهذا البريد الإلكتروني' };
  }
  const owner = data as PharmacyOwner;
  if (!owner.is_active) {
    return { owner: null, pharmacy: null, error: 'هذا الحساب معطّل، تواصل مع مدير الموقع' };
  }
  if (owner.password_hash !== simpleHash(password)) {
    return { owner: null, pharmacy: null, error: 'كلمة المرور غير صحيحة' };
  }
  const pharmacy = await fetchPharmacy(owner.pharmacy_id);
  if (!pharmacy) {
    return { owner: null, pharmacy: null, error: 'الصيدلية المرتبطة بهذا الحساب لم تعد موجودة' };
  }
  setOwnerSession(owner.id);
  return { owner, pharmacy, error: null };
}

export async function fetchPharmacy(pharmacyId: string): Promise<Pharmacy | null> {
  const { data } = await supabase.from('pharmacies').select('*').eq('id', pharmacyId).maybeSingle();
  return (data as Pharmacy | null) || null;
}

export async function fetchOwner(ownerId: string): Promise<PharmacyOwner | null> {
  const { data } = await supabase.from('pharmacy_owners').select('*').eq('id', ownerId).maybeSingle();
  return (data as PharmacyOwner | null) || null;
}
