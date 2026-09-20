import { useState } from 'react';
import { Loader2, Phone, Search, Package, AlertCircle, Truck, Store, MessageCircle, Clock3, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { OrderProgressTracker } from '@/pages/account/OrderProgressTracker';
import { STATUS_META } from '@/pages/account/types';

interface TrackItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total_price: number;
  status: string;
}

interface TrackGroup {
  id: string;
  status: string;
  total_price: number;
  payment_method: string | null;
  created_at: string;
  items: TrackItem[];
}

export function TrackOrderPage() {
  const { t, lang } = useLanguage();
  const { themeColors, settings, paymentConfig } = useSettings();
  const { navigate } = useRouter();
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<TrackGroup[]>([]);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (!/^01[0125]\d{8}$/.test(clean)) return;
    setLoading(true);
    setSearched(true);
    setNotFound(false);
    try {
      const { data, error } = await supabase.rpc('track_guest_orders', { p_phone: clean });
      if (!error && data) {
        const list = (data as TrackGroup[]) || [];
        setGroups(list);
        setNotFound(list.length === 0);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const statusMetaOf = (status: string) => STATUS_META[status] || STATUS_META.pending;
  const shippingNote = paymentConfig.shippingNote?.trim();
  const estimatedMinutes = shippingNote && /30\s*(دقيقة|minute)/i.test(shippingNote) ? 30 : 24 * 60;

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeColors.sectionAltBg || '#f8fafc' }}>
      {/* Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})`,
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">{t('تتبع طلبك')}</h1>
          <p className="text-sm text-white/85 font-medium leading-relaxed max-w-md mx-auto">
            {t('أدخل رقم الهاتف الذي استخدمته عند الطلب لمعرفة حالة طلبك وأين وصل — بدون تسجيل دخول.')}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 -mt-6">
        {/* Search box */}
        <form
          onSubmit={handleTrack}
          className="rounded-3xl bg-white shadow-xl border border-gray-100 p-5 sm:p-6 space-y-3"
        >
          <label className="block text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <Phone className="w-4 h-4" style={{ color: themeColors.priceColor }} />
            {t('رقم الموبايل المستخدم في الطلب')}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Phone className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full ps-10 pe-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-sm"
                style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !/^01[0125]\d{8}$/.test(phone.replace(/\D/g, ''))}
              className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-white font-bold text-sm transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50 shadow-lg"
              style={{ backgroundColor: themeColors.priceColor, boxShadow: `0 8px 20px -6px ${themeColors.priceColor}88` }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('تتبع')}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 font-medium">
            {t('سينعكس هنا أي طلب قدّمته برقم الهاتف هذا — حتى لو لم تستخدم حساباً.')}
          </p>
        </form>

        {/* WhatsApp support for guests */}
        {settings.contact_whatsapp && (
          <a
            href={buildWhatsAppLink(
              settings.contact_whatsapp,
              t('مرحباً، أتابع طلبي برقم الهاتف {0} وأحتاج مساعدة', [phone.replace(/\D/g, '') || ''])
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl py-3.5 px-5 text-white text-sm font-black shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
            style={{ backgroundColor: themeColors.whatsappBtnBg || '#25D366', boxShadow: `0 8px 20px -6px ${themeColors.whatsappBtnBg || '#25D366'}88` }}
          >
            <MessageCircle className="w-5 h-5" />
            {t('تواصل معنا على واتساب لمتابعة طلبك')}
          </a>
        )}

        {/* Results */}
        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: themeColors.priceColor }} />
            <p className="text-xs font-bold">{t('جاري البحث عن طلباتك...')}</p>
          </div>
        )}

        {!loading && searched && notFound && (
          <div className="mt-8 rounded-3xl bg-white border border-gray-100 shadow-sm p-10 text-center space-y-2">
            <Package className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-black text-gray-800">{t('لا توجد طلبات مسجلة بهذا الرقم')}</p>
            <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
              {t('تحقق من الرقم، أو إن كان طلبك مستجداً فانتظر قليلاً ثم أعد المحاولة. إن احتجت مساعدة تواصل مع فريق الدعم.')}
            </p>
            {settings.contact_whatsapp && (
              <a
                href={buildWhatsAppLink(settings.contact_whatsapp, t('مرحباً، لم أجد طلبي برقم الهاتف {0} وأحتاج مساعدة', [phone.replace(/\D/g, '') || '']))}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg transition-all hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: themeColors.whatsappBtnBg || '#25D366', boxShadow: `0 8px 20px -6px ${themeColors.whatsappBtnBg || '#25D366'}88` }}
              >
                <MessageCircle className="w-4 h-4" />
                {t('تواصل معنا على واتساب')}
              </a>
            )}
            <button
              onClick={() => navigate({ name: 'home' })}
              className="mt-3 px-5 py-2.5 rounded-xl text-white text-xs font-bold"
              style={{ backgroundColor: themeColors.priceColor }}
            >
              {t('مواصلة التسوق')}
            </button>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="mt-8 space-y-4">
            {groups.map((g) => {
              const meta = statusMetaOf(g.status);
              return (
                <div key={g.id} className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${themeColors.priceColor}12`, color: themeColors.priceColor }}>
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-800">{t('طلب #{0}', [g.id.slice(0, 6).toUpperCase()])}</p>
                        <p className="text-[10px] text-gray-400 font-semibold">
                          {new Date(g.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${meta.className}`}>
                      {meta.icon}
                      {t(meta.label)}
                    </span>
                  </div>

                  {(g.items || []).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{item.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{t('الكمية: {0}', [item.quantity])}</p>
                      </div>
                      <div className="text-end shrink-0">
                        <p className="text-xs font-black" style={{ color: themeColors.priceColor }}>{item.total_price.toFixed(2)} {t('ج.م')}</p>
                      </div>
                    </div>
                  ))}

                  <div className="px-5 py-4">
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-[11px] text-gray-500 font-bold">{t('إجمالي الطلب')}</span>
                      <span className="text-base font-black" style={{ color: themeColors.priceColor }}>
                        {g.total_price.toFixed(2)} <span className="text-[10px] text-gray-400 font-medium">{t('ج.م')}</span>
                      </span>
                    </div>
                    {g.status !== 'cancelled' && g.status !== 'delivered' && (() => {
                      const estimatedAt = new Date(new Date(g.created_at).getTime() + estimatedMinutes * 60 * 1000);
                      const estimatePassed = Date.now() > estimatedAt.getTime();
                      return (
                        <div className={`mb-3 rounded-xl border p-3 ${estimatePassed ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50/70'}`}>
                          <div className="flex items-start gap-2.5">
                            {estimatePassed ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> : <Clock3 className="w-4 h-4 text-gray-500 shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-gray-800">{t('الوصول المتوقع مبدئياً')}</p>
                              <p className="mt-0.5 text-xs font-black text-gray-900">{estimatedAt.toLocaleString(lang === 'en' ? 'en-GB' : 'ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                              {shippingNote && <p className="mt-0.5 text-[10px] font-bold leading-relaxed text-gray-500">{t(shippingNote)}</p>}
                              {estimatePassed && <p className="mt-1 text-[10px] font-black leading-relaxed text-amber-700">{t('قد يتأخر الطلب عن الموعد التقديري.')}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {g.status !== 'cancelled' && (
                      <OrderProgressTracker status={g.status} color={themeColors.priceColor} />
                    )}
                    {g.status === 'cancelled' && (
                      <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-center gap-2 text-xs font-bold text-rose-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {t('تم إلغاء هذا الطلب.')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
