import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Search, MapPin, Phone, Star, Truck, Save,
  Clock, Shield, Loader2, Check, Copy, ExternalLink, Navigation, Link2,
  KeyRound, UserCog,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { translateError } from '@/lib/errorMessages';
import {
  PHARMACY_SECTION_KEYS, PHARMACY_SECTIONS_META, type PharmacySectionKey,
} from '@/lib/pharmacySections';
import { Field, Modal, ImageUrlField, inputClass, useToast } from './shared';
import type { Pharmacy, PharmacyOwner } from '@/types';

export function PharmaciesTab() {
  const { settings } = useSettings();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Pharmacy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sections, setSections] = useState<Record<string, string[]>>({});
  const [ownersMap, setOwnersMap] = useState<Record<string, PharmacyOwner>>({});
  const [ownerModal, setOwnerModal] = useState<Pharmacy | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    const [pharmRes, sectionsRes, ownersRes] = await Promise.all([
      supabase.from('pharmacies').select('*').order('created_at', { ascending: false }),
      supabase.from('pharmacy_sections').select('pharmacy_id, section_key'),
      supabase.from('pharmacy_owners').select('*'),
    ]);
    setPharmacies((pharmRes.data || []) as Pharmacy[]);

    if (!sectionsRes.error) {
      const map: Record<string, string[]> = {};
      (sectionsRes.data || []).forEach((row) => {
        if (!map[row.section_key]) map[row.section_key] = [];
        if (!map[row.section_key].includes(row.pharmacy_id)) {
          map[row.section_key].push(row.pharmacy_id);
        }
      });
      setSections(map);
    }
    const owners: Record<string, PharmacyOwner> = {};
    if (!ownersRes.error) {
      (ownersRes.data || []).forEach((row) => {
        owners[(row as PharmacyOwner).pharmacy_id] = row as PharmacyOwner;
      });
    }
    setOwnersMap(owners);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPharmacies(); }, [fetchPharmacies]);

  const toggleSection = async (pharmacyId: string, key: PharmacySectionKey) => {
    setSavingKey(`${pharmacyId}:${key}`);
    const isMember = (sections[key] || []).includes(pharmacyId);
    if (isMember) {
      await supabase.from('pharmacy_sections').delete().eq('pharmacy_id', pharmacyId).eq('section_key', key);
      setSections((prev) => ({ ...prev, [key]: (prev[key] || []).filter((id) => id !== pharmacyId) }));
      showToast('تمت إزالة الصيدلية من القسم بنجاح');
    } else {
      await supabase.from('pharmacy_sections').insert({ pharmacy_id: pharmacyId, section_key: key });
      setSections((prev) => ({ ...prev, [key]: [...(prev[key] || []), pharmacyId] }));
      showToast('تمت إضافة الصيدلية للقسم بنجاح');
    }
    setSavingKey(null);
  };

  const filtered = pharmacies.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.area?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصيدلية؟ سيتم حذف جميع منتجاتها أيضاً.')) return;
    await supabase.from('pharmacies').delete().eq('id', id);
    fetchPharmacies();
  };

  const copyOwnerLink = async (pharmacyName: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/admin/pharmacy`);
      showToast(`تم نسخ رابط إدارة "${pharmacyName}"`);
    } catch {
      showToast('تعذر النسخ التلقائي، انسخ الرابط من نافذة الحساب');
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in">
          {toast}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6">
        <div className="relative w-full sm:max-w-xs">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث عن صيدلية..." className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm" style={{ ['--tw-ring-color' as string]: settings.primary_color }} />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-transform hover:scale-105" style={{ backgroundColor: settings.primary_color }}>
          <Plus className="w-4 h-4" /> إضافة صيدلية
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pharmacy) => (
            <div key={pharmacy.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden group">
              <div className="h-20 relative" style={{ background: pharmacy.cover_url ? `url(${pharmacy.cover_url}) center/cover` : `linear-gradient(135deg, ${settings.primary_color}33, ${settings.secondary_color}55)` }}>
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(pharmacy); setShowForm(true); }} className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white"><Edit2 className="w-4 h-4 text-gray-700" /></button>
                  <button onClick={() => handleDelete(pharmacy.id)} className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center hover:bg-white"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${pharmacy.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{pharmacy.is_active ? 'نشطة' : 'متوقفة'}</span>
                {pharmacy.is_24h && <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold bg-white/90 text-gray-800 flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: settings.accent_color }} />24 ساعة</span>}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: settings.primary_color }}>
                    {pharmacy.logo_url ? <img src={pharmacy.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-lg">{pharmacy.name.charAt(0)}</span>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{pharmacy.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{pharmacy.area || pharmacy.address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-50">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3" />{pharmacy.rating}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{pharmacy.phone}</span>
                  {pharmacy.delivery_available && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />توصيل</span>}
                  {pharmacy.accept_insurance && <span className="flex items-center gap-1"><Shield className="w-3 h-3" />تأمين</span>}
                  <span className="text-amber-600 font-bold">
                    {pharmacy.commission_rate ? `${pharmacy.commission_rate}%` : '5%'} عمولة
                  </span>
                  <span className="text-blue-600 font-bold">
                    {pharmacy.subscription_plan === 'enterprise' ? 'مؤسسات' :
                     pharmacy.subscription_plan === 'pro' ? 'احترافية' : 'أساسية'}
                  </span>
                </div>

                {/* Pharmacy owner account */}
                <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap items-center gap-2">
                  {ownersMap[pharmacy.id] ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                      <KeyRound className="w-3 h-3" /> حساب المالك موجود
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                      <UserCog className="w-3 h-3" /> بدون حساب مالك
                    </span>
                  )}
                  <button
                    onClick={() => setOwnerModal(pharmacy)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-900 text-white hover:bg-gray-700 active:scale-95 transition-all"
                  >
                    <KeyRound className="w-3 h-3" />
                    {ownersMap[pharmacy.id] ? 'إدارة حساب المالك' : 'إنشاء حساب المالك'}
                  </button>
                  <button
                    onClick={() => copyOwnerLink(pharmacy.name)}
                    title="نسخ رابط صفحة إدارة الصيدلية"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    <Link2 className="w-3 h-3" /> نسخ الرابط
                  </button>
                </div>

                {/* Home page sections toggle */}
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-[10px] font-black text-gray-400 mb-1.5">الظهور في تبويبات الرئيسية:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PHARMACY_SECTION_KEYS.map((key) => {
                      const m = PHARMACY_SECTIONS_META[key];
                      const active = (sections[key] || []).includes(pharmacy.id);
                      const saving = savingKey === `${pharmacy.id}:${key}`;
                      return (
                        <button
                          key={key}
                          onClick={() => toggleSection(pharmacy.id, key)}
                          disabled={!!saving}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all active:scale-95 disabled:opacity-60 ${
                            active ? 'text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
                          style={active ? { backgroundColor: settings.primary_color, borderColor: settings.primary_color } : {}}
                        >
                          {active ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <PharmacyForm pharmacy={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={() => { fetchPharmacies(); setShowForm(false); setEditing(null); }} />}
      {ownerModal && <OwnerAccountModal pharmacy={ownerModal} onClose={() => setOwnerModal(null)} onSaved={() => fetchPharmacies()} />}
    </div>
  );
}

function OwnerAccountModal({ pharmacy, onClose, onSaved }: { pharmacy: Pharmacy; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const [owner, setOwner] = useState<PharmacyOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('pharmacy_owners')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .maybeSingle();
      if (err && /could not find the table|could not find the function|does not exist|relation .* not found/i.test(err.message)) {
        setError('جدول أصحاب الصيدليات غير موجود — شغّل ملف المايجرشن supabase/migrations/20260808120000_owner_auth_upgrade.sql في Supabase SQL Editor');
      }
      if (data) setOwner(data as PharmacyOwner);
      setLoading(false);
    })();
  }, [pharmacy.id]);

  const ownerLink = `${window.location.origin}/admin/pharmacy`;

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('برجاء إدخال اسم المالك والبريد الإلكتروني وكلمة مرور (6 أحرف على الأقل)');
      return;
    }
    setError(null);
    setSaving(true);
    const normalizedEmail = email.toLowerCase().trim();
    const { data, error: err } = await supabase
      .rpc('create_owner', {
        p_pharmacy_id: pharmacy.id,
        p_full_name: fullName.trim(),
        p_email: normalizedEmail,
        p_password: password,
        p_phone: phone.trim() || null,
      })
      .single();
    if (err) {
      setError(rpcError(err));
      setSaving(false);
      return;
    }
    setOwner(data as PharmacyOwner);
    setPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setSaving(false);
    onSaved();
    showToast('تم إنشاء حساب المالك بنجاح');
  };

  const handleResetPassword = async () => {
    if (resetPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.rpc('reset_owner_password', {
      p_owner_id: owner!.id,
      p_password: resetPassword,
    });
    setSaving(false);
    if (err) {
      setError(rpcError(err));
      return;
    }
    setResetPassword('');
    showToast('تم تغيير كلمة المرور بنجاح');
  };

  const handleToggleActive = async () => {
    setSaving(true);
    const { error: err } = await supabase.rpc('set_owner_active', {
      p_owner_id: owner!.id,
      p_active: !owner!.is_active,
    });
    if (!err) {
      setOwner({ ...owner!, is_active: !owner!.is_active });
      showToast(owner!.is_active ? 'تم تعطيل حساب المالك' : 'تم تفعيل حساب المالك');
    } else {
      setError(rpcError(err));
    }
    setSaving(false);
  };

  function rpcError(err: { message?: string }): string {
    const m = (err.message || '').trim();
    if (!m) return 'حدث خطأ غير متوقع، حاول مرة أخرى';
    if (/function .* does not exist|could not find the function|could not find the table|relation .* not found/i.test(m)) {
      return 'الصلاحية غير موجودة — شغّل ملف المايجرشن supabase/migrations/20260808120000_owner_auth_upgrade.sql في Supabase SQL Editor';
    }
    if (/duplicate key value violates unique constraint/i.test(m)) {
      return 'هذا البريد الإلكتروني مسجل بالفعل كحساب مالك، ولا يمكن استخدامه لصيدلية أخرى';
    }
    return m;
  }

  return (
    <Modal onClose={onClose} title={`حساب مالك "${pharmacy.name}"`} wide>
      <div className="space-y-4">
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl">
            {toast}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Admin link */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
          <p className="text-[11px] font-black text-gray-500 mb-1.5">رابط صفحة إدارة الصيدلية (يرسل لصاحب الصيدلية):</p>
          <div className="flex items-center gap-2">
            <input readOnly value={ownerLink} dir="ltr" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none" />
            <button
              onClick={async () => { await navigator.clipboard.writeText(ownerLink); showToast('تم نسخ الرابط'); }}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
              style={{ backgroundColor: settings.primary_color }}
            >
              <Copy className="w-3.5 h-3.5" /> نسخ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-32 animate-pulse bg-gray-100 rounded-xl" />
        ) : owner ? (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: settings.primary_color }}>
                    {owner.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{owner.full_name}</p>
                    <p className="text-xs text-gray-600" dir="ltr">{owner.email}</p>
                    {owner.phone && <p className="text-[11px] text-gray-500" dir="ltr">{owner.phone}</p>}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${owner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {owner.is_active ? 'الحساب نشط' : 'الحساب معطّل'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">كلمة مرور جديدة</label>
                <input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} dir="ltr" className={inputClass} placeholder="كلمة مرور جديدة (6 أحرف على الأقل)" />
              </div>
              <div className="flex items-end">
                <button onClick={handleResetPassword} disabled={saving} className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-50 hover:brightness-110 transition-all" style={{ backgroundColor: settings.primary_color }}>
                  <KeyRound className="w-3.5 h-3.5" /> تغيير كلمة المرور
                </button>
              </div>
            </div>

            <button
              onClick={handleToggleActive}
              disabled={saving}
              className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${owner.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
            >
              {owner.is_active ? 'تعطيل حساب المالك' : 'تفعيل حساب المالك'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">لا يوجد حساب مالك لهذه الصيدلية بعد. أنشئ حساباً ليرسل لصاحبها ويبدأ بإدارة صيدليته:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="اسم المالك *"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="مثال: أحمد محمد" /></Field>
              <Field label="رقم الهاتف"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} dir="ltr" placeholder="01012345678" /></Field>
            </div>
            <Field label="البريد الإلكتروني *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} dir="ltr" placeholder="owner@example.com" /></Field>
            <Field label="كلمة المرور * (6 أحرف على الأقل)"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} dir="ltr" placeholder="••••••••" /></Field>
            <button onClick={handleCreate} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 hover:brightness-110 active:scale-[0.99] transition-all" style={{ backgroundColor: settings.primary_color }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />} إنشاء حساب المالك
            </button>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إغلاق</button>
        </div>
      </div>
    </Modal>
  );
}

export function PharmacyForm({ pharmacy, onClose, onSaved }: { pharmacy: Pharmacy | null; onClose: () => void; onSaved: () => void }) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: pharmacy?.name || '', name_en: pharmacy?.name_en || '', description: pharmacy?.description || '',
    logo_url: pharmacy?.logo_url || '', cover_url: pharmacy?.cover_url || '',
    phone: pharmacy?.phone || '', whatsapp: pharmacy?.whatsapp || '', email: pharmacy?.email || '',
    address: pharmacy?.address || '', area: pharmacy?.area || '', city: pharmacy?.city || '',
    latitude: pharmacy?.latitude?.toString() || '30.0444', longitude: pharmacy?.longitude?.toString() || '31.2357',
    is_active: pharmacy?.is_active ?? true, rating: pharmacy?.rating?.toString() || '5.0',
    delivery_available: pharmacy?.delivery_available ?? false, delivery_fee: pharmacy?.delivery_fee?.toString() || '0',
    opening_hours: pharmacy?.opening_hours || '', is_24h: pharmacy?.is_24h ?? false,
    has_parking: pharmacy?.has_parking ?? false, accept_insurance: pharmacy?.accept_insurance ?? false,
    website_url: pharmacy?.website_url || '', pharmacy_type: pharmacy?.pharmacy_type || 'حديثة',
    commission_rate: pharmacy?.commission_rate?.toString() || '',
    subscription_plan: pharmacy?.subscription_plan || 'basic',
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const handleDetectLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('المتصفح لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((f) => ({
          ...f,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError('تعذر تحديد الموقع، تأكد من منح الإذن وأعد المحاولة');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form, latitude: parseFloat(form.latitude) || 0, longitude: parseFloat(form.longitude) || 0, rating: parseFloat(form.rating) || 5.0, delivery_fee: parseFloat(form.delivery_fee) || 0, commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null, updated_at: new Date().toISOString() };
    const { error } = pharmacy
      ? await supabase.from('pharmacies').update(payload).eq('id', pharmacy.id)
      : await supabase.from('pharmacies').insert(payload);
    setSaving(false);
    if (error) { toast('فشل حفظ الصيدلية: ' + (translateError(error.message).ar || error.message), 'error'); return; }    onSaved();
  };

  return (
    <Modal onClose={onClose} title={pharmacy ? 'تعديل صيدلية' : 'إضافة صيدلية جديدة'} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم الصيدلية *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="صيدلية..." /></Field>
          <Field label="الاسم بالإنجليزية"><input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Pharmacy name" /></Field>
        </div>
        <Field label="المنطقة"><input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputClass} placeholder="مثال: المعادي" /></Field>
        <Field label="وصف الصيدلية"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={2} placeholder="نبذة عن الصيدلية..." /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="رقم الهاتف"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} dir="ltr" placeholder="01012345678" /></Field>
          <Field label="واتساب"><input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={inputClass} dir="ltr" placeholder="201012345678" /></Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="البريد الإلكتروني"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} dir="ltr" placeholder="email@example.com" /></Field>
          <Field label="ساعات العمل"><input value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} className={inputClass} placeholder="9:00 ص - 11:00 م" /></Field>
        </div>
        <Field label="العنوان *"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} placeholder="العنوان بالتفصيل" /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="خط العرض (Latitude) *"><input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className={inputClass} dir="ltr" placeholder="30.0444" /></Field>
          <Field label="خط الطول (Longitude) *"><input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className={inputClass} dir="ltr" placeholder="31.2357" /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: settings.primary_color }}
          >
            <Navigation className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
            {locating ? 'جاري تحديد الموقع...' : 'تحديد موقع الصيدلية تلقائياً (GPS)'}
          </button>
          {locationError && <span className="text-xs font-bold text-red-500">{locationError}</span>}
        </div>
        {form.latitude && form.longitude && (
          <div className="rounded-2xl overflow-hidden border border-gray-200 relative">
            <iframe
              title="معاينة موقع الصيدلية على الخريطة"
              src={`https://www.google.com/maps?q=${form.latitude},${form.longitude}&z=15&output=embed`}
              className="w-full h-52"
              loading="lazy"
              style={{ border: 0 }}
            />
            <a
              href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 shadow text-xs font-bold text-gray-700 hover:bg-white"
            >
              <ExternalLink className="w-3.5 h-3.5" /> فتح في خرائط جوجل
            </a>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="التقييم"><input value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className={inputClass} dir="ltr" type="number" step="0.1" min="0" max="5" /></Field>
          <Field label="رسوم التوصيل"><input value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} className={inputClass} dir="ltr" type="number" /></Field>
          <Field label="المدينة"><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} placeholder="القاهرة" /></Field>
          <Field label="نوع الصيدلية"><select value={form.pharmacy_type} onChange={(e) => setForm({ ...form, pharmacy_type: e.target.value })} className={inputClass}><option value="حديثة">حديثة</option><option value="شعبية">شعبية</option><option value="متخصصة">متخصصة</option></select></Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="نسبة العمولة (% — فارغ = الافتراضي 5%)"><input value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" max="100" step="0.5" placeholder="5" /></Field>
          <Field label="خطة الاشتراك"><select value={form.subscription_plan} onChange={(e) => setForm({ ...form, subscription_plan: e.target.value })} className={inputClass}><option value="basic">الأساسية (مجاناً)</option><option value="pro">الاحترافية (500 ج.م/شهر)</option><option value="enterprise">المؤسسات (1500 ج.م/شهر)</option></select></Field>
        </div>
        <Field label="رابط موقع الصيدلية"><input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://..." /></Field>
        <ImageUrlField label="رابط شعار الصيدلية (Logo)" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
        <ImageUrlField label="رابط صورة الغلاف" value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} />
        <div className="flex flex-wrap gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">صيدلية نشطة</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.delivery_available} onChange={(e) => setForm({ ...form, delivery_available: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">توصيل</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_24h} onChange={(e) => setForm({ ...form, is_24h: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">24 ساعة</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.has_parking} onChange={(e) => setForm({ ...form, has_parking: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">موقف سيارات</span></label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.accept_insurance} onChange={(e) => setForm({ ...form, accept_insurance: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تأمين صحي</span></label>
        </div>
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.name || !form.address} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}><Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}
