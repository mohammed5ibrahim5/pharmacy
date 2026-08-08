import { supabase } from '@/lib/supabase';
import type { Pharmacy, PharmacyOwner } from '@/types';

export async function loginOwner(
  email: string,
  password: string
): Promise<{ owner: PharmacyOwner | null; pharmacy: Pharmacy | null; error: string | null }> {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !password) {
    return { owner: null, pharmacy: null, error: 'برجاء إدخال البريد الإلكتروني وكلمة المرور' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error) {
    return { owner: null, pharmacy: null, error: translateLoginError(error.message) };
  }

  const uid = data.user.id;
  const { data: owner, error: ownerError } = await supabase
    .from('pharmacy_owners')
    .select('*')
    .eq('id', uid)
    .maybeSingle();
  if (ownerError) {
    await supabase.auth.signOut();
    return { owner: null, pharmacy: null, error: ownerError.message };
  }
  if (!owner) {
    await supabase.auth.signOut();
    return { owner: null, pharmacy: null, error: 'لا يوجد حساب مالك مرتبط بهذا البريد الإلكتروني' };
  }

  const o = owner as PharmacyOwner;
  if (!o.is_active) {
    await supabase.auth.signOut();
    return { owner: null, pharmacy: null, error: 'هذا الحساب معطّل، تواصل مع مدير الموقع' };
  }

  const pharmacy = await fetchPharmacy(o.pharmacy_id);
  if (!pharmacy) {
    await supabase.auth.signOut();
    return { owner: null, pharmacy: null, error: 'الصيدلية المرتبطة بهذا الحساب لم تعد موجودة' };
  }

  return { owner: o, pharmacy, error: null };
}

function translateLoginError(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (/Email not confirmed/i.test(msg)) return 'البريد الإلكتروني غير مؤكد بعد';
  if (/Rate limit/i.test(msg)) return 'تم تجاوز عدد المحاولات، حاول لاحقاً';
  if (/could not find the table|could not find the function|does not exist|relation .* not found/i.test(msg)) {
    return 'جدول أصحاب الصيدليات غير موجود — شغّل ملف المايجرشن supabase/migrations/20260808120000_owner_auth_upgrade.sql في Supabase SQL Editor';
  }
  return msg;
}

export async function signOutOwner(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchPharmacy(pharmacyId: string): Promise<Pharmacy | null> {
  const { data } = await supabase.from('pharmacies').select('*').eq('id', pharmacyId).maybeSingle();
  return (data as Pharmacy | null) || null;
}

export async function fetchOwnerByUserId(userId: string): Promise<PharmacyOwner | null> {
  const { data } = await supabase.from('pharmacy_owners').select('*').eq('id', userId).maybeSingle();
  return (data as PharmacyOwner | null) || null;
}
