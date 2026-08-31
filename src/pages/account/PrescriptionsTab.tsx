import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { supabase } from '@/lib/supabase';
import { localizedError } from '@/lib/errorMessages';
import { localizedDate } from '@/lib/format';
import { dataUrlToBlob } from '@/lib/invoice';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  PRESCRIPTION_STATUS_META,
  type Prescription,
  submitPrescriptionVerification,
  respondPrescriptionClarification,
  deletePrescription,
} from '@/lib/prescriptions';
import {
  FileText, Phone, Send, Trash2, Camera, Loader2, Clock,
  MessageCircle, CheckCircle2,
} from 'lucide-react';
import { PrivateImage } from '@/components/PrivateImage';

export function PrescriptionsTab() {
  const { user, profile } = useCustomer();
  const { settings, themeColors } = useSettings();
  const { t, lang } = useLanguage();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxUploading, setRxUploading] = useState(false);
  const [rxImage, setRxImage] = useState<string | null>(null);
  const [rxPhone, setRxPhone] = useState(profile?.phone || '');
  const [rxNotes, setRxNotes] = useState('');

  const clarifyRx = prescriptions.find((p) => p.pipeline_status === 'clarification_requested') || null;
  const [clarifyNotes, setClarifyNotes] = useState('');
  const [clarifyImage, setClarifyImage] = useState<string | null>(null);
  const [clarifyBusy, setClarifyBusy] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchPrescriptions = useCallback(async () => {
    if (!user) return;
    setRxLoading(true);
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setPrescriptions((data || []) as Prescription[]);
    if (error) showToast(localizedError(error.message, lang));
    setRxLoading(false);
  }, [user, lang]);

  useEffect(() => {
    setRxPhone(profile?.phone || '');
  }, [profile?.phone]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const handleRxImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRxImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxImage) {
      showToast(t('يرجى اختيار صورة الروشتة أو تصويرها بالكامل.'));
      return;
    }
    if (!rxPhone.trim()) {
      showToast(t('يرجى إدخال رقم الهاتف للتواصل وحجز الروشتة.'));
      return;
    }
    setRxUploading(true);
    try {
      await submitPrescriptionVerification({
        file: dataUrlToBlob(rxImage),
        customerId: user?.id || '',
        patientName: profile?.full_name || 'عميل',
        phone: rxPhone.trim(),
        notes: rxNotes.trim(),
      });
      await fetchPrescriptions();
      setRxImage(null);
      setRxNotes('');
      showToast(t('تم إرسال الروشتة بنجاح — جاري الفحص الآلي ثم مراجعة صيدلي مرخص'));
      if (settings.contact_whatsapp) {
        const text = t('مرحباً صيدليتي 👋\nأود طلب دواء عن طريق الروشتة المرفقة.\nرقم الهاتف: {0}\nالملاحظات: {1}', [rxPhone, rxNotes || t('لا يوجد')]);
        window.open(buildWhatsAppLink(settings.contact_whatsapp, text), '_blank');
      }
    } catch {
      showToast(t('فشل رفع الروشتة، برجاء المحاولة مرة أخرى'));
    } finally {
      setRxUploading(false);
    }
  };

  const handleClarifyImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setClarifyImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleClarifySubmit = async () => {
    if (!user || !clarifyRx || clarifyBusy) return;
    if (!clarifyNotes.trim() && !clarifyImage) {
      showToast(t('اكتب توضيحك أو أرفق صورة أوضح للروشتة.'));
      return;
    }
    setClarifyBusy(true);
    try {
      await respondPrescriptionClarification({
        rxId: clarifyRx.id,
        customerId: user.id,
        file: clarifyImage ? dataUrlToBlob(clarifyImage) : undefined,
        notes: clarifyNotes,
      });
      await fetchPrescriptions();
      setClarifyNotes('');
      setClarifyImage(null);
      showToast(t('تم إرسال ردك — سيراجعه الصيدلي في أقرب وقت'));
    } catch {
      showToast(t('تعذر إرسال الرد، حاول مرة أخرى'));
    } finally {
      setClarifyBusy(false);
    }
  };

  const handleDeletePrescription = async (rx: Prescription) => {
    try {
      await deletePrescription(rx.id, rx.image_url);
      await fetchPrescriptions();
      showToast(t('تم حذف الروشتة'));
    } catch {
      showToast(t('فشل حذف الروشتة'));
    }
  };

  const handleResendPrescription = (rx: Prescription) => {
    if (!settings.contact_whatsapp) return;
    const text = t('مرحباً صيدليتي 👋\nأود طلب دواء عن طريق الروشتة المرفقة.\nرقم الهاتف: {0}\nالملاحظات: {1}', [rx.phone, rx.notes || t('لا يوجد')]);
    window.open(buildWhatsAppLink(settings.contact_whatsapp, text), '_blank');
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
            <FileText className="w-5.5 h-5.5 text-teal-600" />
            {t('الروشتات الطبية المحفوظة')}
          </h2>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} روشتة', [prescriptions.length])}</span>
        </div>

        <form onSubmit={handleRxSubmit} className="bg-white rounded-[2rem] border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-none">{t('حفظ وإرسال روشتة جديدة')}</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-1">{t('ارفع صورة الروشتة وسنقوم بتوصيل الأدوية فوراً')}</p>
            </div>
          </div>

          {rxImage ? (
            <div className="relative rounded-2xl overflow-hidden border-2 max-h-64 bg-slate-950 flex items-center justify-center border-teal-500">
              <img src={rxImage} alt={t('روشتة')} className="max-h-64 w-auto object-contain mx-auto" />
              <button type="button" onClick={() => setRxImage(null)} className="absolute top-3 end-3 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl bg-slate-50/50 hover:bg-teal-50/20 transition-all cursor-pointer group text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md bg-white border border-slate-100 text-teal-600">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">{t('اضغط هنا لالتقاط أو رفع صورة الروشتة')}</p>
                <p className="text-[11px] text-slate-400 font-bold mt-1">{t('يدعم صيغ الصور JPG, PNG حتى حجم 5 ميجابايت')}</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleRxImageUpload} />
            </label>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative">
              <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={rxPhone}
                onChange={(e) => setRxPhone(e.target.value)}
                placeholder={t('رقم الهاتف للتأكيد والتواصل')}
                dir="ltr"
                className="w-full ps-10 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:bg-white"
                style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
              />
            </div>
            <input
              type="text"
              value={rxNotes}
              onChange={(e) => setRxNotes(e.target.value)}
              placeholder={t('ملاحظات للصيدلي (نوع الجرعة، بدائل مقبولة)')}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:bg-white"
              style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
            />
          </div>

          <button
            type="submit"
            disabled={rxUploading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-black shadow-md hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
            style={{ backgroundColor: themeColors.primaryColor }}
          >
            {rxUploading ? (
              <><Loader2 className="w-4.5 h-4.5 animate-spin" />{t('جاري رفع وتأمين الروشتة...')}</>
            ) : (
              <><Send className="w-4.5 h-4.5" />{t('حفظ الروشتة وإرسالها للصيدلي')}</>
            )}
          </button>
        </form>

        {clarifyRx && (
          <div className="bg-amber-50 rounded-[2rem] border-2 border-amber-300 p-5 sm:p-6 shadow-sm space-y-4 animate-fade-up">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-100 text-amber-600 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-amber-900 text-base leading-snug">{t('الصيدلي يحتاج توضيحاً بخصوص روشتتك')}</h3>
                {clarifyRx.review_notes && (
                  <p className="text-xs text-amber-800 font-bold mt-1.5 leading-relaxed bg-amber-100/70 rounded-xl p-3">{clarifyRx.review_notes}</p>
                )}
              </div>
            </div>
            {clarifyImage && (
              <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 max-h-56 bg-slate-950 flex items-center justify-center">
                <img src={clarifyImage} alt={t('صورة أوضح')} className="max-h-56 w-auto object-contain mx-auto" />
                <button type="button" onClick={() => setClarifyImage(null)} className="absolute top-3 end-3 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <textarea
              value={clarifyNotes}
              onChange={(e) => setClarifyNotes(e.target.value)}
              rows={2}
              placeholder={t('اكتب توضيحك هنا (اسم الدواء، الجرعة، اسم الطبيب...)')}
              className="w-full px-4 py-3 bg-white border border-amber-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="flex flex-col sm:flex-row gap-2.5">
              <label className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-amber-300 bg-white/60 text-amber-700 text-xs font-black cursor-pointer hover:bg-amber-100/60 transition-colors">
                <Camera className="w-4 h-4" />
                {clarifyImage ? t('تم اختيار صورة أوضح ✓') : t('أرفق صورة أوضح للروشتة')}
                <input type="file" accept="image/*" className="hidden" onChange={handleClarifyImage} />
              </label>
              <button
                type="button"
                onClick={handleClarifySubmit}
                disabled={clarifyBusy}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-black transition-colors active:scale-[0.99] shadow-sm"
              >
                {clarifyBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('إرسال الرد للصيدلي')}
              </button>
            </div>
          </div>
        )}

        {rxLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-100 rounded-3xl h-64 skeleton" />
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-teal-500/10 text-teal-600">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-black text-slate-900 text-base mb-1.5">{t('لا توجد روشتات محفوظة')}</h3>
            <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">{t('قم برفع الروشتة الطبية الخاصة بك للاحتفاظ بنسخة رقمية مشفرة منها للتأمين وسهولة تكرار الطلب.')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((rx) => {
              const meta = PRESCRIPTION_STATUS_META[rx.status] || PRESCRIPTION_STATUS_META.new;
              return (
                <div key={rx.id} className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
                  <div>
                    <div className="h-40 bg-slate-950 relative flex items-center justify-center overflow-hidden">
                      <PrivateImage bucket="prescriptions" src={rx.image_url} alt={t('روشتة')} className="max-h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105" />
                      <span className="absolute top-3.5 start-3.5 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] font-black border border-white/10">
                        <Clock className="w-3 h-3" />
                        {localizedDate(rx.created_at, lang, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`absolute bottom-3.5 end-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border ${meta.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {t(meta.label)}
                      </span>
                    </div>
                    <div className="p-4.5 space-y-2">
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-bold">
                        <Phone className="w-4 h-4 text-teal-600" />
                        <span dir="ltr">{rx.phone}</span>
                      </p>
                      {rx.notes && (
                        <p className="text-xs text-slate-600 font-bold line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-xl">{rx.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-4.5 pt-0 flex items-center gap-2">
                    <button
                      onClick={() => handleResendPrescription(rx)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-black transition-colors hover:brightness-110 shadow-sm"
                      style={{ backgroundColor: themeColors.primaryColor }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {t('إرسال واتساب')}
                    </button>
                    <button
                      onClick={() => handleDeletePrescription(rx)}
                      className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0"
                      title={t('حذف الروشتة')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
