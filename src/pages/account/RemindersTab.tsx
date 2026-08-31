import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import {
  loadLocalReminders,
  saveLocalReminders,
  requestNotificationPermission,
  medicationRunOutInfo,
  computeRefillDate,
} from '@/lib/loyalty';
import type { MedicationReminder } from '@/types';
import {
  Bell, Plus, Pill, Clock, Trash2, XCircle, CheckCircle2,
  AlertTriangle, Loader2,
} from 'lucide-react';

const WEEKDAYS = [
  { n: 0, label: 'أحد', short: 'أ' },
  { n: 1, label: 'اثنين', short: 'إ' },
  { n: 2, label: 'ثلاثاء', short: 'ث' },
  { n: 3, label: 'أربعاء', short: 'ر' },
  { n: 4, label: 'خميس', short: 'خ' },
  { n: 5, label: 'جمعة', short: 'ج' },
  { n: 6, label: 'سبت', short: 'س' },
];

export function RemindersTab() {
  const { themeColors } = useSettings();
  const { t, lang } = useLanguage();

  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [remName, setRemName] = useState('');
  const [remDose, setRemDose] = useState('');
  const [remTime, setRemTime] = useState('09:00');
  const [remDays, setRemDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [remNote, setRemNote] = useState('');
  const [remDaysSupply, setRemDaysSupply] = useState('');
  const [permDenied, setPermDenied] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const saveReminders = (next: MedicationReminder[]) => {
    setReminders(next);
    saveLocalReminders(next);
  };

  useEffect(() => {
    setReminders(loadLocalReminders());
    if (typeof Notification !== 'undefined') {
      setPermDenied(Notification.permission === 'denied');
    }
  }, []);

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remName.trim()) {
      showToast(t('يرجى إدخال اسم الدواء.'));
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      setPermDenied(true);
      showToast(t('قم بتفعيل إشعارات المتصفح لتذكير المواعيد'));
      return;
    }
    const rec: MedicationReminder = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: remName.trim(),
      dosage: remDose.trim(),
      time: remTime,
      days: remDays,
      note: remNote.trim(),
      refillDate: remDaysSupply.trim() ? computeRefillDate(Number(remDaysSupply.trim())) : null,
      created_at: new Date().toISOString(),
    };
    saveReminders([...reminders, rec]);
    setRemName('');
    setRemDose('');
    setRemNote('');
    setRemDaysSupply('');
    showToast(t('تمت إضافة الدواء إلى ملفك الدوائي بنجاح'));
  };

  const handleRemoveReminder = (id: string) => {
    saveReminders(reminders.filter((r) => r.id !== id));
    showToast(t('تم حذف التذكير'));
  };

  const toggleReminderDay = (n: number) => {
    setRemDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort()));
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
            <Bell className="w-5.5 h-5.5 text-teal-600" />
            {t('ملفي الطبي وجدول الأدوية')}
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} دواء مسجل', [reminders.length])}</span>
        </div>

        {permDenied && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4.5 flex items-start gap-3">
            <Bell className="w-5.5 h-5.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-amber-800 leading-relaxed">
              <p className="font-black">{t('تنبيه: الإشعارات معطلة')}</p>
              <p className="mt-1 font-medium">{t('يرجى تفعيل صلاحية الإشعارات من إعدادات المتصفح لكي نتمكن من تنبيهك بمواعيد جرعات الدواء وتذكيرك بقرب نفاد العلبة.')}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-none">{t('إضافة دواء لجدول التذكيرات')}</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-1">{t('سجل مواعيد الجرعات لتذكيرك بها تلقائياً')}</p>
            </div>
          </div>
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('اسم الدواء والمواصفات *')}</label>
                <input value={remName} onChange={(e) => setRemName(e.target.value)} placeholder={t('مثال: كونكور 5 ملغ')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('الجرعة وطريقة أخذها (اختياري)')}</label>
                <input value={remDose} onChange={(e) => setRemDose(e.target.value)} placeholder={t('مثال: نصف قرص صباحاً')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('توقيت المنبه الأول *')}</label>
                <input type="time" value={remTime} onChange={(e) => setRemTime(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('أيام الأسبوع')}</label>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => {
                    const active = remDays.includes(d.n);
                    return (
                      <button type="button" key={d.n} onClick={() => toggleReminderDay(d.n)} className={`w-7 h-7 rounded-xl text-[10px] font-black border transition-all active:scale-90 ${active ? 'text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`} style={active ? { backgroundColor: themeColors.primaryColor } : {}}>
                        {t(d.short)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('كم يوماً تكفي العبوة الحالية؟')}</label>
                <input type="number" min="1" value={remDaysSupply} onChange={(e) => setRemDaysSupply(e.target.value)} placeholder={t('مثال: 30')} dir="ltr" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('إرشادات وتنبيهات الاستخدام (اختياري)')}</label>
              <input value={remNote} onChange={(e) => setRemNote(e.target.value)} placeholder={t('مثال: يؤخذ قبل الوجبات بـ 30 دقيقة')} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white" />
            </div>
            <button type="submit" className="w-full sm:w-auto px-6 py-3 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all" style={{ backgroundColor: themeColors.primaryColor }}>
              <Bell className="w-4 h-4" />
              {t('حفظ في الملف الدوائي')}
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-base font-black text-slate-900 mb-3.5">{t('الأدوية الدورية والجدول')}</h3>
          {reminders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
              <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h4 className="font-black text-slate-900 text-base mb-1.5">{t('جدول التنبيهات خالي')}</h4>
              <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">{t('قم بإضافة أدويتك اليومية للحفاظ على صحتك وسيقوم صيدليتي بتذكيرك بجرعتك بانتظام وبقرب نفاد علبة الدواء.')}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...reminders]
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((r) => {
                  const dayNames = WEEKDAYS.filter((d) => r.days.includes(d.n)).map((d) => d.short);
                  const isToday = r.days.includes(new Date().getDay());
                  const runOut = medicationRunOutInfo(r);
                  return (
                    <div key={r.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600">
                          <Pill className="w-5.5 h-5.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-black text-slate-900 truncate">{r.name}</p>
                            {isToday && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-600">{t('اليوم')}</span>}
                          </div>
                          <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {t('التوقيت:')} <strong className="text-slate-800 leading-none">{r.time}</strong>
                          </p>
                          {r.dosage && <p className="text-xs font-bold text-slate-500 mt-1">{t('الجرعة:')} <span className="text-slate-700">{r.dosage}</span></p>}
                          {r.note && <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed italic bg-slate-50 p-1.5 rounded-lg">"{r.note}"</p>}
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {dayNames.map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-500">{t(s)}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-slate-100/80 pt-3 mt-4 flex items-center justify-between">
                        <div>
                          {runOut.status === 'out' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-500/10 text-rose-600">
                              <XCircle className="w-3.5 h-3.5" />
                              {t('انتهى المخزون')}
                            </span>
                          )}
                          {runOut.status === 'soon' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-500/10 text-amber-600 animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {t('ينفد خلال {0} يوم', [runOut.daysLeft!])}
                            </span>
                          )}
                          {runOut.status === 'ok' && runOut.daysLeft != null && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500/10 text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {t('متبقي {0} يوم', [runOut.daysLeft])}
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleRemoveReminder(r.id)} className="w-8.5 h-8.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors active:scale-95 shrink-0" title={t('حذف التذكير')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
