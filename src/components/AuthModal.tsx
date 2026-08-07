import { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, Cross, Phone, Camera, Info, Link2 } from 'lucide-react';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { translateError } from '@/lib/errorMessages';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: Props) {
  const { signIn, signUp } = useCustomer();
  const { themeColors } = useSettings();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarLinkMode, setAvatarLinkMode] = useState(false);
  const [avatarLinkValue, setAvatarLinkValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t('حجم الصورة يجب أن يكون أقل من 2MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup') {
      if (!name.trim()) { setError(t('يرجى إدخال الاسم')); return; }
      if (!phone.trim()) { setError(t('يرجى إدخال رقم الهاتف')); return; }
    }
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await signIn(email, password)
          : await signUp(email, password, name.trim(), phone.trim(), avatar);
      if (res.error) {
        const msg = res.error.includes('Invalid login')
          ? t('عذراً، بيانات الدخول غير صحيحة')
          : res.error;
        setError(msg);
        return;
      }
      onClose();
    } catch {
      setError(t('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto relative"
        style={{ backgroundColor: themeColors.modalBodyBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="p-6 pb-8 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${themeColors.modalHeaderBg}, ${themeColors.priceColor})` }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            aria-label={t('إغلاق')}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Cross className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-extrabold text-white">
              {mode === 'login' ? t('تسجيل الدخول') : t('إنشاء حساب جديد')}
            </h2>
            <p className="text-white/80 text-sm mt-1">
              {mode === 'login' ? t('أهلاً بعودتك! سجل دخولك للمتابعة') : t('انضم إلينا لتتمكن من طلب المنتجات')}
            </p>
          </div>
        </div>

<div className="p-6">
          {error && (() => {
            const translated = translateError(error);
            return (
              <div className="mb-5 rounded-2xl border border-red-200 bg-gradient-to-bl from-red-50 to-orange-50 p-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-red-700 mb-0.5">{translated.ar}</p>
                    {translated.hint && (
                      <p className="text-xs text-red-600/80 flex items-start gap-1 leading-relaxed">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {translated.hint}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="space-y-4 mb-5">
                {/* Avatar upload */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div
                      className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border-4 bg-gray-100"
                      style={{ borderColor: `${themeColors.priceColor}33` }}
                    >
                      {avatar ? (
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-gray-300" />
                      )}
                    </div>
                    <label
                      className="absolute bottom-0 left-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-transform shadow-lg"
                      style={{ backgroundColor: themeColors.priceColor }}
                    >
                      <Camera className="w-4 h-4 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">{t('أضف صورة بروفيل (اختياري)')}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {!avatarLinkMode ? (
                      <button
                        type="button"
                        onClick={() => setAvatarLinkMode(true)}
                        className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
                      >
                        <Link2 className="w-3 h-3" />{' '}{t('أو ألصق رابط صورة')}
                      </button>
                    ) : (
                      <div className="flex gap-1.5 w-full">
                        <input
                          value={avatarLinkValue}
                          onChange={(e) => setAvatarLinkValue(e.target.value)}
                          placeholder="https://..."
                          dir="ltr"
                          className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2"
                          style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (avatarLinkValue.trim()) {
                              setAvatar(avatarLinkValue.trim());
                              setAvatarLinkMode(false);
                              setAvatarLinkValue('');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-white text-[11px] font-bold"
                          style={{ backgroundColor: themeColors.priceColor }}
                        >
                          {t('استخدام')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('الاسم الكامل *')}</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                      style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                      placeholder={t('اسمك الكامل')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('رقم الهاتف *')}</label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      dir="ltr"
                      className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                      style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('البريد الإلكتروني')}</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                    style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('كلمة المرور')}</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    dir="ltr"
                    className="w-full pr-11 pl-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                    style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

<button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 shadow-lg"
                style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? t('تسجيل الدخول') : t('إنشاء الحساب')}
              </button>
            </div>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              {mode === 'login' ? t('ليس لديك حساب؟') : t('لديك حساب بالفعل؟')}
              <button
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                className="mr-1 font-semibold hover:underline"
                style={{ color: themeColors.priceColor }}
              >
                {mode === 'login' ? t('إنشاء حساب') : t('تسجيل الدخول')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
