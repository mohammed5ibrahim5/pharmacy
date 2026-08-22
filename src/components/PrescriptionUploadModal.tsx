import React, { useEffect, useRef, useState } from 'react';
import {
  FileText, Camera, X, Check, Phone, AlertCircle, Loader2,
  ShieldCheck, UserCheck, Sun, Frame, ScanLine, RefreshCw, TriangleAlert,
  ClipboardList, Fingerprint, BadgeCheck, CircleAlert, RotateCcw,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  submitPrescriptionVerification,
  getProductNamesRequiringRx,
  VERIFICATION_STAGES,
  RISK_LEVEL_META,
} from '@/lib/prescriptions';
import { warmUpOcr } from '@/lib/ocr';
import { localizedError } from '@/lib/errorMessages';

interface PrescriptionUploadModalProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = 'guide' | 'photo' | 'identity' | 'processing' | 'result';

interface OutcomeOk {
  kind: 'needs_review';
  fields: Record<string, string | undefined>;
  riskLevel: 'normal' | 'restricted' | 'narcotic';
  warnings: string[];
}
interface OutcomeRejected {
  kind: 'auto_rejected';
  reason: string;
}
type Outcome = OutcomeOk | OutcomeRejected;

const EGYPT_PHONE_RE = /^01[0125]\d{8}$/;

export function PrescriptionUploadModal({ open, onClose }: PrescriptionUploadModalProps) {
  const { themeColors, verificationConfig } = useSettings();
  const { profile, user, setAuthModalOpen } = useCustomer();
  const { t, lang } = useLanguage();

  const [step, setStep] = useState<WizardStep>('guide');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [stageIndex, setStageIndex] = useState(-1);
  const [ocrPct, setOcrPct] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // تسخين محرك القراءة (تحميل النماذج) بمجرد فتح النافذة
  useEffect(() => {
    if (open) void warmUpOcr();
  }, [open]);

  useEffect(() => {
    if (open) {
      setStep('guide');
      setFile(null);
      setPreviewUrl(null);
      setOutcome(null);
      setError(null);
      setStageIndex(-1);
      setPatientName(profile?.full_name || '');
      setPhone(profile?.phone || '');
      setNotes('');
    }
  }, [open, profile?.full_name, profile?.phone]);

  if (!open) return null;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError(t('يرجى اختيار صورة صالحة (JPG أو PNG).'));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(t('حجم الصورة كبير جداً، الحد الأقصى 10 ميجابايت.'));
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.width < 500) {
        setError(t('دقة الصورة منخفضة جداً. قرّب كويس وصوّر الروشتة من مسافة أقرب.'));
        return;
      }
      setError(null);
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
      setStep('photo');
    };
    img.onerror = () => setError(t('تعذر قراءة الصورة، جرّب صورة أخرى.'));
    img.src = URL.createObjectURL(f);
  };

  const startVerification = async () => {
    if (!file || !user) return;
    const name = patientName.trim();
    const ph = phone.replace(/[\s-]/g, '');
    if (name.length < 3) {
      setError(t('يرجى إدخال اسم المريض كاملاً للتأكد من الهوية.'));
      return;
    }
    if (!EGYPT_PHONE_RE.test(ph)) {
      setError(t('أدخل رقم هاتف مصري صحيح (مثال: 01012345678).'));
      return;
    }

    setError(null);
    setStep('processing');
    setOcrPct(null);
    try {
      const productNames = await getProductNamesRequiringRx().catch(() => [] as string[]);
      const result = await submitPrescriptionVerification({
        file,
        customerId: user.id,
        patientName: name,
        phone: ph,
        notes: notes.trim(),
        cfg: verificationConfig,
        productNames,
        onProgress: (i) => setStageIndex(i),
        onOcrProgress: (pct) => setOcrPct(pct),
      });
      setOutcome(
        result.kind === 'needs_review'
          ? {
              kind: 'needs_review',
              fields: result.fields as unknown as Record<string, string | undefined>,
              riskLevel: result.riskLevel,
              warnings: result.warnings,
            }
          : { kind: 'auto_rejected', reason: result.reason }
      );
    } catch (err) {
      const msg = localizedError((err as { message?: string })?.message || '', lang);
      setError(msg || t('حدث خطأ أثناء الفحص، برجاء المحاولة مرة أخرى.'));
      setStep('identity');
    }
  };

  const resetToGuide = () => {
    setStep('guide');
    setFile(null);
    setPreviewUrl(null);
    setOutcome(null);
    setError(null);
    setStageIndex(-1);
  };

  const wizardDots: { id: WizardStep; label: string }[] = [
    { id: 'guide', label: t('التصوير') },
    { id: 'photo', label: t('مراجعة الصورة') },
    { id: 'identity', label: t('بيانات المريض') },
    { id: 'processing', label: t('الفحص الآلي') },
  ];
  const activeDotIndex =
    step === 'result' ? 3 : Math.max(0, wizardDots.findIndex((d) => d.id === step));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={step === 'processing' ? undefined : onClose}>
      <div
        className="rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-gray-100 flex flex-col max-h-[92vh]"
        style={{ backgroundColor: themeColors.modalBodyBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 text-white relative flex items-center justify-between shrink-0"
          style={{ background: `linear-gradient(135deg, ${themeColors.modalHeaderBg}, ${themeColors.priceColor})` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">{t('رفع روشتة طبية')}</h3>
              <p className="text-xs text-white/80">{t('فحص آلي + مراجعة صيدلي مرخّص قبل الصرف')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={step === 'processing'}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard progress dots */}
        {(step === 'guide' || step === 'photo' || step === 'identity' || step === 'result') && !outcome && (
          <div className="flex items-center justify-center gap-1.5 px-5 pt-4 pb-1">
            {wizardDots.map((d, i) => (
              <div key={d.id} className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full transition-all ${i <= activeDotIndex ? 'scale-110' : 'opacity-30'}`}
                  style={{ backgroundColor: i <= activeDotIndex ? themeColors.priceColor : '#94a3b8' }}
                />
                <span className={`text-[10px] font-bold ${i === activeDotIndex ? 'text-gray-800' : 'text-gray-400'} hidden sm:inline`}>
                  {d.label}
                </span>
                {i < wizardDots.length - 1 && <span className="w-3 h-px bg-gray-200" />}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!user ? (
            /* ---------- يتطلب تسجيل دخول ---------- */
            <div className="py-8 text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-lg">
                <Fingerprint className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-extrabold text-gray-900">{t('التسجيل مطلوب لرفع الروشتة')}</h4>
              <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                {t('لأن بياناتك الطبية سرية، لازم تكون مسجل بحساب قبل رفع الروشتة عشان تقدر تتابع حالتها وتستلم الكود المرجعي.')}
              </p>
              <button
                onClick={() => {
                  onClose();
                  setAuthModalOpen(true);
                }}
                className="px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                {t('تسجيل الدخول / إنشاء حساب')}
              </button>
            </div>
          ) : step === 'guide' ? (
            /* ---------- الخطوة 1: إرشادات التصوير ---------- */
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-teal-800 font-extrabold text-sm">
                  <Camera className="w-4 h-4" />
                  {t('لضمان قبول روشتتك من أول مرة:')}
                </div>
                {[
                  { icon: <Sun className="w-4 h-4" />, text: t('صوّر في إضاءة كويسة وبدون انعكاس أو ظل على الورق') },
                  { icon: <Frame className="w-4 h-4" />, text: t('خلي الروشتة كاملة في الإطار — من أول سطر لآخر ختم') },
                  { icon: <ScanLine className="w-4 h-4" />, text: t('ثبّت إيدك وخلي النص واضح ومقروء قبل ما تصور') },
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white border border-teal-100 px-3 py-2">
                    <span className="text-teal-600">{tip.icon}</span>
                    <span className="text-[11px] font-bold text-gray-700 leading-relaxed">{tip.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full py-4 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                <Camera className="w-5 h-5" />
                {t('تصوير الروشتة بالكاميرا')}
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ClipboardList className="w-4 h-4" />
                {t('أو ارفع صورة من معرض الصور')}
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
              <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

              <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                {t('صورتك بتتشفّر وبتتراجع من صيدلي مرخص فقط — ولا يتم صرف أي دواء بدون اعتماد رسمي')}
              </p>
            </div>
          ) : step === 'photo' && previewUrl ? (
            /* ---------- الخطوة 2: مراجعة الصورة ---------- */
            <div className="space-y-4 animate-fade-in">
              <div className="relative rounded-2xl overflow-hidden border-2 max-h-72 bg-slate-900 flex items-center justify-center" style={{ borderColor: `${themeColors.priceColor}66` }}>
                <img src={previewUrl} alt={t('روشتة')} className="max-h-72 w-auto object-contain" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={resetToGuide}
                  className="py-3 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('إعادة التصوير')}
                </button>
                <button
                  onClick={() => setStep('identity')}
                  className="py-3 text-white font-bold text-xs rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: themeColors.priceColor }}
                >
                  <Check className="w-4 h-4" />
                  {t('الصورة تمام ✋ متابعة')}
                </button>
              </div>
            </div>
          ) : step === 'identity' ? (
            /* ---------- الخطوة 3: بيانات المريض ---------- */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                startVerification();
              }}
              className="space-y-4 animate-fade-in"
            >
              <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-3 flex items-start gap-2">
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-blue-900 leading-relaxed">
                  {t('بنطلب اسمك ورقم موبايلك للتأكد من هوية صاحب الروشتة ومنع إعادة استخدامها — بياناتك مشفرة ومحمية.')}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">{t('اسم المريض *')}</label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder={t('الاسم الثلاثي كما في البطاقة')}
                  required
                  minLength={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">{t('رقم الهاتف *')}</label>
                <div className="relative">
                  <Phone className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    required
                    dir="ltr"
                    className="w-full ps-10 pe-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">{t('ملاحظات للصيدلي (اختياري)')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder={t('أي تفاصيل عن الجرعات أو حالة المريض...')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 resize-none"
                  style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                <ShieldCheck className="w-5 h-5" />
                {t('إرسال لسلسلة الفحص الآمنة')}
              </button>
            </form>
          ) : step === 'processing' ? (
            /* ---------- الخطوة 4: شاشة الفحص المتحركة ---------- */
            <div className="py-6 space-y-5 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin" />
                  <ScanLine className="absolute inset-0 m-auto w-7 h-7 text-teal-600" />
                </div>
                <h4 className="font-black text-gray-900">{t('جاري فحص روشتتك...')}</h4>
                <p className="text-[11px] text-gray-500">{t('ماتبعدش الصفحة — أول فحص بيحمّل ملفات القراءة (لحد دقيقة)، واللي بعده أسرع بكثير')}</p>
              </div>
              <div className="space-y-2">
                {VERIFICATION_STAGES.map((stage, i) => {
                  const done = stageIndex > i;
                  const active = stageIndex === i;
                  return (
                    <div
                      key={stage}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
                        done ? 'bg-teal-50 border-teal-200' : active ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-50'
                      }`}
                    >
                      {done ? (
                        <BadgeCheck className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : active ? (
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: themeColors.priceColor }} />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                      )}
                      <span className={`text-[11px] font-extrabold ${done ? 'text-teal-700' : 'text-gray-700'}`}>{stage}</span>
                      {active && i === 1 && ocrPct !== null && (
                        <span className="ms-auto text-[10px] font-black tabular-nums" style={{ color: themeColors.priceColor }}>
                          {ocrPct}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : outcome?.kind === 'needs_review' ? (
            /* ---------- الخطوة 5أ: نجاح + بيانات مستخرجة ---------- */
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-2 pt-1">
                <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-lg">
                  <BadgeCheck className="w-9 h-9" />
                </div>
                <h4 className="text-lg font-extrabold text-gray-900">{t('استلمنا روشتتك بنجاح')}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {t('اجتازت الفحص الآلي الأولي وهي الآن في طابور مراجعة صيدلي حقيقي مرخّص. هنخطرك فور الاعتماد.')}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{t('البيانات المستخرجة آلياً')}</p>
                {[
                  { label: t('الدواء'), value: outcome.fields.drug_name },
                  { label: t('الجرعة'), value: outcome.fields.dosage },
                  { label: t('الطبيب'), value: outcome.fields.doctor_name },
                  { label: t('رقم النقابة'), value: outcome.fields.doctor_syndicate_no },
                  { label: t('تاريخ الإصدار'), value: outcome.fields.issue_date },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-500">{row.label}</span>
                    <span className="font-extrabold text-gray-800">{row.value || t('— لم يُتعرف —')}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200">
                  <span className="font-bold text-gray-500">{t('درجة الخطورة')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${RISK_LEVEL_META[outcome.riskLevel].className}`}>
                    {RISK_LEVEL_META[outcome.riskLevel].label}
                  </span>
                </div>
              </div>

              {outcome.warnings.length > 0 && (
                <div className="space-y-1.5">
                  {outcome.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                      <TriangleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-bold text-amber-800 leading-relaxed">{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 text-white font-bold text-sm rounded-2xl shadow-lg active:scale-95 transition-transform"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                {t('تمام، في انتظار مراجعة الصيدلي')}
              </button>
            </div>
          ) : outcome?.kind === 'auto_rejected' ? (
            /* ---------- الخطوة 5ب: رفض آلي ---------- */
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-2 pt-1">
                <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-lg">
                  <CircleAlert className="w-9 h-9" />
                </div>
                <h4 className="text-lg font-extrabold text-gray-900">{t('تم رفض الروشتة آلياً')}</h4>
                <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
                  {outcome.reason === 'expired'
                    ? t('الروشتة انتهت صلاحيتها. محتاج روشتة حديثة من طبيبك.')
                    : t('الصورة مش واضحة كفاية أو البيانات ناقصة. جرّب تصويرها تاني بإضاءة أحلى وكاملة في الإطار.')}
                </p>
              </div>
              <button
                onClick={resetToGuide}
                className="w-full py-3 text-white font-bold text-sm rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                <RefreshCw className="w-4 h-4" />
                {t('إعادة المحاولة بصورة جديدة')}
              </button>
            </div>
          ) : null}

          {error && (step === 'guide' || step === 'photo') && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
