import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';
import type { FamilyMember } from '@/types';
import {
  Users, Baby, Pencil, Save, Trash2, Plus, Loader2, CheckCircle2,
  Pill, Clock, Share2, AlertTriangle,
} from 'lucide-react';

export function FamilyTab() {
  const { user } = useCustomer();
  const { featuresConfig, themeColors } = useSettings();
  const { t, lang } = useLanguage();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [famForm, setFamForm] = useState({ name: '', relation: '', age: '', weight: '', profile_type: 'adult', medical_notes: '', allergies_summary: '' });
  const [healthMember, setHealthMember] = useState<FamilyMember | null>(null);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medTime, setMedTime] = useState('09:00');
  const [allergy, setAllergy] = useState('');
  const [healthRows, setHealthRows] = useState<{ medications: Array<{ id: string; name: string; dose: string }>; allergies: Array<{ id: string; allergen: string; severity: string }> }>({ medications: [], allergies: [] });

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchFamilyMembers = useCallback(async () => {
    if (!user || !featuresConfig.familyMembers) return;
    setFamilyLoading(true);
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at');
    if (!error) setFamilyMembers((data || []) as FamilyMember[]);
    setFamilyLoading(false);
  }, [user, featuresConfig.familyMembers]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const handleFamilySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !famForm.name.trim()) {
      showToast(t('يرجى إدخال اسم العضو'));
      return;
    }
    setFamilySaving(true);
    const payload = {
      customer_id: user.id,
      name: famForm.name.trim(),
      relation: famForm.relation.trim() || null,
      age: famForm.age.trim() ? Number(famForm.age.trim()) : null,
      weight: famForm.weight.trim() ? Number(famForm.weight.trim()) : null,
      profile_type: famForm.profile_type,
      medical_notes: famForm.medical_notes.trim() || null,
      allergies_summary: famForm.allergies_summary.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (editingMember) {
      const { error } = await supabase.from('family_members').update(payload).eq('id', editingMember.id);
      if (error) showToast(localizedError(error.message, lang));
    } else {
      const { error } = await supabase.from('family_members').insert(payload);
      if (error) showToast(localizedError(error.message, lang));
    }
    setFamilySaving(false);
    setEditingMember(null);
    setFamForm({ name: '', relation: '', age: '', weight: '', profile_type: 'adult', medical_notes: '', allergies_summary: '' });
    fetchFamilyMembers();
  };

  const handleFamilyDelete = async (id: string) => {
    if (!confirm(t('هل أنت متأكد من حذف هذا العضو؟'))) return;
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    if (error) showToast(localizedError(error.message, lang));
    fetchFamilyMembers();
  };

  const startEditMember = (m: FamilyMember) => {
    setEditingMember(m);
    setFamForm({ name: m.name, relation: m.relation || '', age: m.age?.toString() || '', weight: m.weight?.toString() || '', profile_type: m.profile_type || 'adult', medical_notes: m.medical_notes || '', allergies_summary: m.allergies_summary || '' });
  };

  const openHealth = async (member: FamilyMember) => {
      setHealthMember(member);
      const [medications, allergies] = await Promise.all([
        supabase.from('patient_medications').select('id, name, dose').eq('family_member_id', member.id).eq('active', true),
        supabase.from('patient_allergies').select('id, allergen, severity').eq('family_member_id', member.id).eq('active', true),
      ]);
      setHealthRows({ medications: medications.data || [], allergies: allergies.data || [] });
  };

  const addMedication = async () => {
      if (!user || !healthMember || !medName.trim() || !medDose.trim()) return;
    const medicationText = medName.trim().toLocaleLowerCase();
    const allergyMatch = healthRows.allergies.find((item) => medicationText.includes(item.allergen.toLocaleLowerCase()) || item.allergen.toLocaleLowerCase().includes(medicationText));
    if (allergyMatch) {
      showToast(t('تحذير: اسم الدواء يطابق حساسية محفوظة. راجع الصيدلي قبل إضافته.'));
      return;
    }
      const { data } = await supabase.from('patient_medications').insert({ customer_id: user.id, family_member_id: healthMember.id, name: medName.trim(), dose: medDose.trim(), source: 'family_profile' }).select('id, name, dose').single();
      if (data) {
        await supabase.from('medication_schedules').insert({ customer_id: user.id, family_member_id: healthMember.id, medication_id: data.id, medication_name: data.name, dose: data.dose, time_of_day: medTime });
        setHealthRows((prev) => ({ ...prev, medications: [...prev.medications, data] }));
        setMedName(''); setMedDose(''); showToast(t('تمت إضافة الدواء والجرعة.'));
      }
  };

  const addAllergy = async () => {
      if (!user || !healthMember || !allergy.trim()) return;
      const { data } = await supabase.from('patient_allergies').insert({ customer_id: user.id, family_member_id: healthMember.id, allergen: allergy.trim(), severity: 'unknown' }).select('id, allergen, severity').single();
      if (data) { setHealthRows((prev) => ({ ...prev, allergies: [...prev.allergies, data] })); setAllergy(''); showToast(t('تمت إضافة الحساسية.')); }
  };

  const shareHealthProfile = async () => {
      if (!healthMember) return;
      const { error } = await supabase.rpc('grant_pharmacist_profile_access', { p_family_member_id: healthMember.id, p_pharmacy_id: null, p_hours: 24 });
      showToast(error ? t('تعذر مشاركة الملف.') : t('تمت مشاركة الملف مع الصيدلي لمدة 24 ساعة بموافقتك.'));
  };

  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-black px-6 py-3.5 rounded-full shadow-2xl animate-bounce-in flex items-center gap-2 border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          {toast}
        </div>
      )}
      <div className="space-y-5 animate-fade-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5.5 h-5.5 text-teal-600" />
            {t('ملفات أفراد العائلة')}
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} فرد مسجل', [familyMembers.length])}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed font-bold -mt-2">
          {t('أضف كبار السن، الأطفال أو زوجتك لتتمكن من إنشاء ملفات طبية لهم ومتابعة طلباتهم وصرف أدويتهم بشكل أسهل ومنفصل.')}
        </p>

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <form onSubmit={handleFamilySave} className="bg-white rounded-[2rem] border border-slate-200/80 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
                {editingMember ? <Pencil className="w-4.5 h-4.5" /> : <Users className="w-4.5 h-4.5" />}
              </div>
              <h3 className="font-black text-slate-900 text-sm">{editingMember ? t('تعديل الملف العائلي') : t('إضافة فرد جديد')}</h3>
            </div>
            <input type="text" value={famForm.name} onChange={(e) => setFamForm({ ...famForm, name: e.target.value })} placeholder={t('اسم العضو بالكامل')} className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100" style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }} />
            <div className="grid grid-cols-3 gap-2">
              <select value={famForm.relation} onChange={(e) => setFamForm({ ...famForm, relation: e.target.value })} className="w-full px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none">
                <option value="">{t('العلاقة')}</option>
                <option value="son">{t('ابن')}</option>
                <option value="daughter">{t('ابنة')}</option>
                <option value="father">{t('الأب')}</option>
                <option value="mother">{t('الأم')}</option>
                <option value="spouse">{t('زوج/زوجة')}</option>
                <option value="other">{t('أخرى')}</option>
              </select>
              <input type="number" min="0" max="120" value={famForm.age} onChange={(e) => setFamForm({ ...famForm, age: e.target.value })} placeholder={t('العمر')} className="w-full px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none" dir="ltr" />
              <input type="number" min="0" step="0.1" value={famForm.weight} onChange={(e) => setFamForm({ ...famForm, weight: e.target.value })} placeholder={t('الوزن (كجم)')} className="w-full px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={famForm.profile_type} onChange={(e) => setFamForm({ ...famForm, profile_type: e.target.value })} className="w-full px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"><option value="child">{t('طفل')}</option><option value="adult">{t('بالغ')}</option><option value="senior">{t('كبير سن')}</option></select>
              <input value={famForm.allergies_summary} onChange={(e) => setFamForm({ ...famForm, allergies_summary: e.target.value })} placeholder={t('حساسيات مهمة')} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none" />
            </div>
            <textarea value={famForm.medical_notes} onChange={(e) => setFamForm({ ...famForm, medical_notes: e.target.value })} placeholder={t('ملاحظات صحية مهمة (أمراض مزمنة، تنبيهات...)')} rows={2} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none resize-none" />
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={familySaving} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black disabled:opacity-50 transition-all active:scale-95 shadow-sm" style={{ backgroundColor: themeColors.primaryColor }}>
                <Save className="w-3.5 h-3.5" />
                {familySaving ? t('جاري الحفظ...') : editingMember ? t('حفظ التعديل') : t('إضافة الفرد')}
              </button>
              {editingMember && (
                <button type="button" onClick={() => { setEditingMember(null); setFamForm({ name: '', relation: '', age: '', weight: '', profile_type: 'adult', medical_notes: '', allergies_summary: '' }); }} className="px-4 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50">
                  {t('إلغاء')}
                </button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {familyLoading && (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}
            {!familyLoading && familyMembers.length === 0 && (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200/80 p-6 text-center text-xs font-bold text-slate-400">
                {t('لم تقم بإضافة أي من أفراد العائلة بعد.')}
              </div>
            )}
            {familyMembers.map((m) => (
              <div key={m.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4.5 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600 shrink-0">
                  <Baby className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-500 font-bold mt-1">
                    {m.relation ? t(m.relation) : t('أخرى')}
                    {` • ${t(m.profile_type || 'adult')}`}
                    {m.age != null && ` • ${t('{0} سنة', [m.age])}`}
                    {m.weight != null && ` • ${m.weight} ${t('كجم')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openHealth(m)} className="w-8.5 h-8.5 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 flex items-center justify-center transition-colors" title={t('الملف الصحي')}><Pill className="w-4 h-4" /></button>
                  <button onClick={() => startEditMember(m)} className="w-8.5 h-8.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors" title={t('تعديل')}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleFamilyDelete(m.id)} className="w-8.5 h-8.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title={t('حذف')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {healthMember && (
          <div className="rounded-[2rem] border border-teal-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3"><h3 className="text-base font-black text-slate-900">{t('الملف الصحي لـ {0}', [healthMember.name])}</h3><button onClick={shareHealthProfile} className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-black text-white"><Share2 className="w-3.5 h-3.5" />{t('مشاركة مع الصيدلي 24 ساعة')}</button></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 p-4 space-y-3"><p className="flex items-center gap-2 text-sm font-black"><Pill className="w-4 h-4 text-teal-600" />{t('الأدوية ومواعيد الجرعات')}</p><div className="flex gap-2"><input value={medName} onChange={(e) => setMedName(e.target.value)} placeholder={t('اسم الدواء')} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input value={medDose} onChange={(e) => setMedDose(e.target.value)} placeholder={t('الجرعة')} className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-xs" /><input type="time" value={medTime} onChange={(e) => setMedTime(e.target.value)} className="w-24 rounded-xl border border-slate-200 px-2 py-2 text-xs" /><button onClick={addMedication} className="rounded-xl bg-teal-600 px-3 text-white"><Plus className="w-4 h-4" /></button></div>{healthRows.medications.map((med) => <p key={med.id} className="text-xs font-bold text-slate-600">{med.name} - {med.dose}</p>)}</div>
              <div className="rounded-2xl bg-rose-50 p-4 space-y-3"><p className="flex items-center gap-2 text-sm font-black text-rose-800"><AlertTriangle className="w-4 h-4" />{t('الحساسيات')}</p><div className="flex gap-2"><input value={allergy} onChange={(e) => setAllergy(e.target.value)} placeholder={t('اسم المادة أو الدواء')} className="min-w-0 flex-1 rounded-xl border border-rose-200 px-3 py-2 text-xs" /><button onClick={addAllergy} className="rounded-xl bg-rose-600 px-3 text-white"><Plus className="w-4 h-4" /></button></div>{healthRows.allergies.map((item) => <p key={item.id} className="text-xs font-bold text-rose-700">{item.allergen}</p>)}</div>
            </div>
            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{t('تُستخدم مواعيد الجرعات للتذكير فقط، ولا تغني عن تعليمات الطبيب.')}</p>
          </div>
        )}
      </div>
    </>
  );
}
