import React, { useState } from 'react';
import { FileText, Camera, X, Check, Phone, MessageSquare, AlertCircle, Send, Loader2, Link2, ShieldCheck, UserCheck } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { useLanguage } from '@/context/LanguageContext';
import { uploadPrescriptionImage, insertPrescription } from '@/lib/prescriptions';
import { localizedError } from '@/lib/errorMessages';

interface PrescriptionUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrescriptionUploadModal({ open, onClose }: PrescriptionUploadModalProps) {
  const { settings, themeColors } = useSettings();
  const { profile, user } = useCustomer();
  const { t, lang } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [notes, setNotes] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError(t('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.'));
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError(t('يرجى اختيار صورة الروشتة أو تصويرها بالكامل.'));
      return;
    }
    if (!phone.trim()) {
      setError(t('يرجى أدخال رقم الهاتف للتواصل وحجز الروشتة.'));
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const imageUrl = image.startsWith('data:') ? await uploadPrescriptionImage(image) : image;
      await insertPrescription({
        customerId: user?.id || null,
        imageUrl,
        phone: phone.trim(),
        notes: notes.trim(),
      });
      setSentSuccess(true);
      // Notify the pharmacy via WhatsApp (text summary)
      if (settings.contact_whatsapp) {
        const text = encodeURIComponent(
          t('مرحباً صيدليتي 👋\nأود طلب دواء عن طريق الروشتة المرفقة.\nرقم الهاتف: {0}\nالملاحظات: {1}', [phone, notes || t('لا يوجد')])
        );
        window.open(`https://wa.me/${settings.contact_whatsapp}?text=${text}`, '_blank');
      }
      setTimeout(() => {
        setSentSuccess(false);
        setImage(null);
        setNotes('');
        onClose();
      }, 1400);
    } catch (err) {
      const msg = localizedError((err as { message?: string })?.message || '', lang);
      setError(msg || t('فشل رفع الروشتة، برجاء المحاولة مرة أخرى.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]"
        style={{ backgroundColor: themeColors.modalBodyBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 text-white relative flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${themeColors.modalHeaderBg}, ${themeColors.priceColor})` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">{t('رفع روشتة طبية أو صورة الدواء')}</h3>
              <p className="text-xs text-white/80">{t('صوّر الروشتة وسيراجعها صيدلي حقيقي مرخّص قبل التنفيذ')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {sentSuccess ? (
            <div className="py-8 text-center space-y-3 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto shadow-lg animate-bounce">
                <Check className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-extrabold text-gray-900">{t('تم إرسال الروشتة بنجاح!')}</h4>
              <p className="text-xs text-gray-600">{t('صيدلي حقيقي مرخّص يراجعها الآن، وسيتواصل معك على الرقم المسجل لتأكيد الصرف والجرعات.')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Review steps reassurance */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-teal-800">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <p className="text-[11px] font-extrabold">{t('لن يُصرف أي دواء قبل مراجعة صيدلي حقيقي مرخّص لروشتك')}</p>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { icon: <Camera className="w-3.5 h-3.5" />, text: t('صوّر الروشتة أو ارفع صورة لها') },
                    { icon: <UserCheck className="w-3.5 h-3.5" />, text: t('يراجعها صيدلي حقيقي ويتحقق من الجرعات') },
                    { icon: <Phone className="w-3.5 h-3.5" />, text: t('نتصل بك للتأكيد قبل التنفيذ') },
                  ].map((step, i, arr) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-xl bg-white border border-teal-100 px-2.5 py-1.5 text-teal-700">
                        {step.icon}
                        <span className="text-[10px] font-bold">{step.text}</span>
                      </div>
                      {i < arr.length - 1 && <span className="text-teal-300 text-xs font-black">←</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Preview or Upload Area */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">{t('صورة الروشتة / الدواء *')}</label>
                {image ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-teal-500 max-h-56 bg-slate-900 flex items-center justify-center">
                    <img src={image} alt={t('روشتة')} className="max-h-56 w-auto object-contain" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      className="absolute top-2 end-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-2xl bg-gray-50 hover:bg-teal-50/40 transition-all cursor-pointer group text-center space-y-2">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md"
                        style={{ backgroundColor: `${themeColors.priceColor}15`, color: themeColors.priceColor }}
                      >
                        <Camera className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{t('اضغط هنا لالتقاط صورة أو رفع الروشتة')}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{t('يدعم صور JPG, PNG حتى 5MB')}</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {!linkMode ? (
                      <button
                        type="button"
                        onClick={() => setLinkMode(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        {t('أو ألصق رابط صورة الروشتة')}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={linkValue}
                          onChange={(e) => setLinkValue(e.target.value)}
                          placeholder="https://example.com/rx.jpg"
                          dir="ltr"
                          className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                          style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (linkValue.trim()) {
                              setImage(linkValue.trim());
                              setLinkMode(false);
                              setLinkValue('');
                            }
                          }}
                          className="px-4 py-2.5 rounded-xl text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: themeColors.priceColor }}
                        >
                          {t('استخدام الرابط')}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">{t('رقم الهاتف للتواصل *')}</label>
                <div className="relative">
                  <Phone className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    required
                    dir="ltr"
                    className="w-full ps-10 pe-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                    style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">{t('ملاحظات إضافية للصيدلي (اختياري)')}</label>
                <div className="relative">
                  <MessageSquare className="absolute end-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder={t('اكتب أية ملاحظات بخصوص الجرعات أو البدائل المتاحة...')}
                    className="w-full ps-10 pe-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 resize-none"
                    style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 text-white font-bold text-sm rounded-xl shadow-lg transition-transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('جاري رفع الروشتة لإرسالها للصيدلي...')}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('إرسال الروشتة لمراجعة صيدلي حقيقي')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
