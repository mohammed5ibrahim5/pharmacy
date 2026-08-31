import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';
import type { FamilyMember } from '@/types';
import {
  Users, Baby, Pencil, Save, Trash2, Plus, Loader2, CheckCircle2,
} from 'lucide-react';

export function FamilyTab() {
  const { user } = useCustomer();
  const { featuresConfig, themeColors } = useSettings();
  const { t, lang } = useLanguage();

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [famForm, setFamForm] = useState({ name: '', relation: '', age: '', weight: '' });

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
    setFamForm({ name: '', relation: '', age: '', weight: '' });
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
    setFamForm({ name: m.name, relation: m.relation || '', age: m.age?.toString() || '', weight: m.weight?.toString() || '' });
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
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={familySaving} className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black disabled:opacity-50 transition-all active:scale-95 shadow-sm" style={{ backgroundColor: themeColors.primaryColor }}>
                <Save className="w-3.5 h-3.5" />
                {familySaving ? t('جاري الحفظ...') : editingMember ? t('حفظ التعديل') : t('إضافة الفرد')}
              </button>
              {editingMember && (
                <button type="button" onClick={() => { setEditingMember(null); setFamForm({ name: '', relation: '', age: '', weight: '' }); }} className="px-4 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50">
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
                    {m.age != null && ` • ${t('{0} سنة', [m.age])}`}
                    {m.weight != null && ` • ${m.weight} ${t('كجم')}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
      </div>
    </>
  );
}
