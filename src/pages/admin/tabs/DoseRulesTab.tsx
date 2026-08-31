import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, Info, Droplets, X, Calculator } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import type { DoseRule } from '@/lib/doseRules';
import { Field, inputClass, slugifyEn } from './shared';

interface DoseFormRow { labelAr: string; kind: 'mgPer5ml' | 'mgPerMl'; amount: string; }

const EMPTY_DOSE_FORM: DoseRule = {
  key: '', nameAr: '', nameEn: '', basis: 'perDose', low: 10, high: 15,
  perDay: 3, intervalH: 8, minAgeMonths: 0, note: '', forms: [],
};

export function DoseRulesTab() {
  const { settings } = useSettings();
  const [rows, setRows] = useState<DoseRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<DoseRule>(EMPTY_DOSE_FORM);
  const [formRows, setFormRows] = useState<DoseFormRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('medicine_dose_rules').select('*').order('name_ar');
    setRows((data || []).map((r: Record<string, unknown>) => ({
      key: String(r.key),
      nameAr: String(r.name_ar),
      nameEn: String(r.name_en),
      basis: r.basis === 'perDay' ? 'perDay' : 'perDose',
      low: Number(r.low),
      high: Number(r.high),
      perDay: Number(r.per_day),
      intervalH: Number(r.interval_h),
      minAgeMonths: Number(r.min_age_months),
      maxDailyMgPerKg: r.max_daily_mg_per_kg != null ? Number(r.max_daily_mg_per_kg) : undefined,
      maxSingleMg: r.max_single_mg != null ? Number(r.max_single_mg) : undefined,
      note: (r.note as string) || undefined,
      forms: Array.isArray(r.forms) ? (r.forms as DoseRule['forms']) : [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startNew = () => {
    setForm({ ...EMPTY_DOSE_FORM });
    setFormRows([]);
    setEditingKey('new');
    setMsg('');
  };

  const startEdit = (r: DoseRule) => {
    setForm({ ...r });
    setFormRows(r.forms.map((f) => ({
      labelAr: f.labelAr,
      kind: f.mgPerMl ? 'mgPerMl' : 'mgPer5ml',
      amount: String(f.mgPerMl ?? f.mgPer5ml ?? ''),
    })));
    setEditingKey(r.key);
    setMsg('');
  };

  const removeRow = async (key: string) => {
    if (!window.confirm('حذف هذه القاعدة؟ الأدوية المدمجة افتراضياً سترجع لقيمها الافتراضية.')) return;
    await supabase.from('medicine_dose_rules').delete().eq('key', key);
    void load();
  };

  const save = async () => {
    if (!form.nameAr.trim()) { setMsg('اسم الدواء بالعربية مطلوب'); return; }
    if (!Number(form.low) || !Number(form.high) || Number(form.high) < Number(form.low)) { setMsg('النطاق غير صحيح: من يجب أن يكون أقل من أو يساوي إلى'); return; }
    setSaving(true);
    const key = form.key.trim() || slugifyEn(form.nameEn || form.nameAr);
    const payload = {
      key,
      name_ar: form.nameAr.trim(),
      name_en: form.nameEn.trim() || key,
      basis: form.basis,
      low: Number(form.low),
      high: Number(form.high),
      per_day: Math.max(1, Math.min(6, Number(form.perDay) || 1)),
      interval_h: Math.max(1, Math.min(24, Number(form.intervalH) || 24)),
      min_age_months: Math.max(0, Number(form.minAgeMonths) || 0),
      max_daily_mg_per_kg: form.maxDailyMgPerKg ? Number(form.maxDailyMgPerKg) : null,
      max_single_mg: form.maxSingleMg ? Number(form.maxSingleMg) : null,
      note: form.note?.trim() || null,
      forms: formRows
        .filter((f) => f.labelAr.trim() && Number(f.amount) > 0)
        .map((f, i) => ({ id: `${key}-${i}`, labelAr: f.labelAr.trim(), [f.kind]: Number(f.amount) })),
    };
    const { error } = await supabase.from('medicine_dose_rules').upsert(payload, { onConflict: 'key' });
    setSaving(false);
    if (error) { setMsg('خطأ في الحفظ: ' + error.message); return; }
    setEditingKey(null);
    void load();
  };

  if (loading) return <div className="p-10 text-center text-sm text-gray-400 font-bold">جارِ التحميل…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-gray-900">قواعد جرعات الأطفال</h2>
          <p className="text-xs text-gray-500 font-bold mt-0.5">أي قاعدة تضيفها هنا تظهر تلقائياً في حاسبة جرعات الأطفال داخل الموقع</p>
        </div>
        {editingKey === null && (
          <button onClick={startNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-black transition-all hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: settings.primary_color }}>
            <Plus className="w-4 h-4" /> إضافة دواء جديد
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-3.5 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
        <p className="text-xs font-bold text-teal-800 leading-relaxed">
          الحاسبة مدمجة أصلاً بـ 5 أدوية شائعة (باراسيتامول، إيبوبروفين، أموكسيسيلين، أزيثروميسين، سيتريزين).
          لو أضفت قاعدة بنفس المفتاح الإنجليزي (مثل paracetamol) هتستبدل القيمة المدمجة — ولو بمفتاح جديد هتتحضاف كدواء إضافي.
          الجرعة تُحسب: الوزن × مجم/كجم، والتركيزات تحوّل النتيجة إلى مل.
        </p>
      </div>

      {msg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-bold text-red-700">{msg}</div>
      )}

      {rows.length === 0 && editingKey === null && (
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-8 text-center">
          <Calculator className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-500">لا توجد قواعد مضافة من اللوحة بعد — الحاسبة تستخدم القواعد المدمجة</p>
        </div>
      )}

      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.key} className="rounded-2xl border border-gray-200 bg-white p-4 flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900">{r.nameAr} <span className="text-[10px] text-gray-400 font-bold">({r.nameEn} · {r.key})</span></p>
              <p className="text-[11px] text-gray-500 font-bold mt-1">
                {r.basis === 'perDose' ? `${r.low}–${r.high} مجم/كجم لكل جرعة` : `${r.low}–${r.high} مجم/كجم/يوم ÷ ${r.perDay}`}
                {' • '}كل {r.intervalH} ساعة{' • '}أقل عمر: {r.minAgeMonths} شهر
                {r.maxDailyMgPerKg ? ` • حد أقصى ${r.maxDailyMgPerKg} مجم/كجم/يوم` : ''}
              </p>
              {r.forms.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.forms.map((f) => (
                    <span key={f.id} className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">{f.labelAr}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => startEdit(r)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => removeRow(r.key)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {editingKey !== null && (
        <div className="rounded-2xl border-2 p-5 space-y-4" style={{ borderColor: `${settings.primary_color}40`, backgroundColor: `${settings.primary_color}05` }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900">{editingKey === 'new' ? 'إضافة قاعدة جديدة' : `تعديل: ${form.nameAr}`}</h3>
            <button onClick={() => setEditingKey(null)} className="w-8 h-8 rounded-lg bg-white/80 hover:bg-white flex items-center justify-center text-gray-500"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="الاسم بالعربية *"><input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className={inputClass} placeholder="مثال: كلورفينامين" /></Field>
            <Field label="الاسم بالإنجليزية"><input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr" className={inputClass} placeholder="Chlorpheniramine" /></Field>
          </div>
          <Field label="المفتاح (اختياري — يُنشأ تلقائياً من الاسم الإنجليزي)"><input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} dir="ltr" className={inputClass} placeholder="chlorpheniramine" /></Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="أساس الحساب">
              <select value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value as DoseRule['basis'] })} className={inputClass}>
                <option value="perDose">لكل جرعة واحدة (مجم/كجم)</option>
                <option value="perDay">لكل يوم كامل (يُقسم على عدد المرات)</option>
              </select>
            </Field>
            <Field label={form.basis === 'perDose' ? 'من (مجم/كجم/جرعة) *' : 'من (مجم/كجم/يوم) *'}><input type="number" step="0.01" min="0" value={form.low} onChange={(e) => setForm({ ...form, low: parseFloat(e.target.value) })} className={inputClass} dir="ltr" /></Field>
            <Field label={form.basis === 'perDose' ? 'إلى (مجم/كجم/جرعة) *' : 'إلى (مجم/كجم/يوم) *'}><input type="number" step="0.01" min="0" value={form.high} onChange={(e) => setForm({ ...form, high: parseFloat(e.target.value) })} className={inputClass} dir="ltr" /></Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="مرات في اليوم"><input type="number" min="1" max="6" value={form.perDay} onChange={(e) => setForm({ ...form, perDay: parseInt(e.target.value) || 1 })} className={inputClass} dir="ltr" /></Field>
            <Field label="كل كم ساعة"><input type="number" min="1" max="24" value={form.intervalH} onChange={(e) => setForm({ ...form, intervalH: parseInt(e.target.value) || 24 })} className={inputClass} dir="ltr" /></Field>
            <Field label="أقل عمر (بالأشهر)"><input type="number" min="0" value={form.minAgeMonths} onChange={(e) => setForm({ ...form, minAgeMonths: parseInt(e.target.value) || 0 })} className={inputClass} dir="ltr" /></Field>
            <Field label="حد أقصى يومي (مجم/كجم) — اختياري"><input type="number" min="0" value={form.maxDailyMgPerKg ?? ''} onChange={(e) => setForm({ ...form, maxDailyMgPerKg: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputClass} dir="ltr" placeholder="60" /></Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="سقف الجرعة الواحدة (مجم) — اختياري"><input type="number" min="0" value={form.maxSingleMg ?? ''} onChange={(e) => setForm({ ...form, maxSingleMg: e.target.value ? parseFloat(e.target.value) : undefined })} className={inputClass} dir="ltr" placeholder="10" /></Field>
            <Field label="ملاحظة تظهر تحت اسم الدواء"><input value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputClass} placeholder="كل 6-8 ساعات بعد الأكل" /></Field>
          </div>

          <div className="rounded-2xl bg-white/70 border border-gray-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-gray-700 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5" style={{ color: settings.primary_color }} /> التركيزات المتاحة (لتحويل المجم إلى مل)</p>
              <button type="button" onClick={() => setFormRows([...formRows, { labelAr: '', kind: 'mgPer5ml', amount: '' }])} className="text-[11px] font-black px-2 py-1 rounded-lg text-white" style={{ backgroundColor: settings.primary_color }}>+ تركيز</button>
            </div>
            {formRows.length === 0 && <p className="text-[11px] text-gray-400 font-bold">لو مش هتضيف تركيزات، النتيجة هتظهر بالمجم فقط.</p>}
            {formRows.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={f.labelAr} onChange={(e) => setFormRows(formRows.map((x, j) => j === i ? { ...x, labelAr: e.target.value } : x))} className={inputClass + ' flex-1'} placeholder="شراب 120 مجم/5 مل" />
                <select value={f.kind} onChange={(e) => setFormRows(formRows.map((x, j) => j === i ? { ...x, kind: e.target.value as DoseFormRow['kind'] } : x))} className={inputClass + ' w-36'}>
                  <option value="mgPer5ml">مجم / 5 مل</option>
                  <option value="mgPerMl">مجم / مل</option>
                </select>
                <input type="number" min="0" value={f.amount} onChange={(e) => setFormRows(formRows.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} className={inputClass + ' w-24'} dir="ltr" placeholder="120" />
                <button type="button" onClick={() => setFormRows(formRows.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-black disabled:opacity-50 transition-all active:scale-95" style={{ backgroundColor: settings.primary_color }}>
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />} حفظ القاعدة
            </button>
            <button onClick={() => setEditingKey(null)} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-black hover:bg-gray-200">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
