import { useEffect, useState } from 'react';
import {
  X, Scale, Star, MapPin, Truck, ShieldCheck, Phone, MessageCircle,
  Navigation2, Store, BadgeCheck, Navigation, CircleCheck, CircleMinus, Award, Crosshair,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCompare } from '@/context/CompareContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useRouter } from '@/context/RouterContext';
import { formatDistance, getPharmacyWithDistance } from '@/lib/distance';
import { getDirectionsUrl } from '@/lib/directions';
import { buildWhatsAppLink } from '@/lib/whatsapp';

interface Props {
  onClose: () => void;
}

function BoolRow({ value }: { value: boolean }) {
  const { t } = useLanguage();
  return value ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600">
      <CircleCheck className="w-4 h-4" />
      <span>{t('نعم')}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-300">
      <CircleMinus className="w-4 h-4" />
      <span>—</span>
    </span>
  );
}

export function PharmacyCompareModal({ onClose }: Props) {
  const { themeColors } = useSettings();
  const { t, lang } = useLanguage();
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { location, requestLocation, loading: locationLoading } = useGeolocation();
  const { navigate } = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (compareList.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="rounded-3xl w-full max-w-md p-8 text-center"
          style={{ backgroundColor: themeColors.modalBodyBg }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${themeColors.priceColor}12`, color: themeColors.priceColor }}
          >
            <Scale className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">{t('لا توجد صيدليات للمقارنة')}</h3>
          <p className="text-sm text-gray-500 font-bold mb-6">
            {t('أضف صيدليتين أو أكثر من بطاقات الصيدليات ثم قارن بينها.')}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-extrabold hover:brightness-110 active:scale-95 transition-all"
            style={{ backgroundColor: themeColors.primaryColor }}
          >
            {t('إغلاق')}
          </button>
        </div>
      </div>
    );
  }

  const withDist = compareList.map((p) =>
    getPharmacyWithDistance(p, location?.latitude, location?.longitude)
  );

  const count = withDist.length;
  const maxRating = count > 1 ? Math.max(...withDist.map((p) => p.rating)) : null;
  const minDist =
    count > 1 && withDist.every((p) => p.distance != null)
      ? Math.min(...withDist.map((p) => p.distance as number))
      : null;
  const deliveryOnly = count > 1 && withDist.filter((p) => p.delivery_available).length === 1;

  const distancesAvailable = count > 1 && withDist.every((p) => p.distance != null);
  const maxDist = distancesAvailable ? Math.max(...withDist.map((p) => p.distance as number)) : null;
  const scoreFor = (p: (typeof withDist)[number]): number => {
    let s = (p.rating / 5) * 40;
    if (maxDist != null) s += (1 - (p.distance ?? maxDist) / maxDist) * 35;
    if (p.delivery_available) s += 15;
    if (p.accept_insurance) s += 10;
    return s;
  };
  const bestPharmacy =
    count > 1 ? withDist.reduce((a, b) => (scoreFor(b) > scoreFor(a) ? b : a)) : null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`rounded-3xl w-full max-w-6xl flex flex-col relative ${mounted ? 'animate-fade-in' : ''}`}
        style={{ backgroundColor: themeColors.modalBodyBg, maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-3xl"
          style={{ backgroundColor: themeColors.modalHeaderBg }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${themeColors.priceColor}12`, color: themeColors.priceColor }}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black" style={{ color: themeColors.modalHeaderText }}>
                {t('قارن الصيدليات جنباً لجنب')}
              </h2>
              <p className="text-[11px] font-bold" style={{ color: themeColors.modalBodyText }}>
                {t('قارن المسافة والتوصيل والتقييمات والمزايا في جدول واحد')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={clearCompare}
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-[11px] font-extrabold text-gray-500 hover:text-red-500 transition-colors"
            >
              {t('مسح الكل')}
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ color: themeColors.modalHeaderText }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recommendation banner */}
        {bestPharmacy && (
          <div className="px-4 sm:px-6 pt-4">
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: `linear-gradient(135deg, ${themeColors.priceColor}18, ${themeColors.accentColor}18)`,
                border: `1px solid ${themeColors.priceColor}25`,
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-md"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                <Award className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">
                  {t('الأفضل لك: {0}', [lang === 'en' ? (bestPharmacy.name_en || bestPharmacy.name) : bestPharmacy.name])}
                </p>
                <p className="text-[11px] font-bold text-gray-500">
                  {t('بناءً على التقييم والمسافة والتوصيل')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate({ name: 'pharmacy', id: bestPharmacy.id });
                }}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-[11px] font-extrabold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
              >
                {t('تصفح الأدوية')}
              </button>
            </div>
          </div>
        )}

        {/* Table body (horizontal scroll on mobile) */}
        <div className="overflow-x-auto flex-1 min-h-0">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                <th className="w-40 text-start p-4 align-top">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wide">{t('المقارنة')}</span>
                </th>
                {withDist.map((pharmacy) => (
                  <th key={pharmacy.id} className="p-4 text-center align-top border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <div className="relative flex flex-col items-center">
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeFromCompare(pharmacy.id)}
                        className="absolute -top-1 -end-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-all z-10"
                        title={t('إزالة')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div
                        className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-2xl border-4 border-white shadow-lg mb-2"
                        style={{ backgroundColor: themeColors.primaryColor }}
                      >
                        {pharmacy.logo_url ? (
                          <img src={pharmacy.logo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <span>{(lang === 'en' ? pharmacy.name_en || pharmacy.name : pharmacy.name).charAt(0)}</span>
                        )}
                      </div>
                      <p className="text-sm font-black leading-snug text-gray-900">
                        {lang === 'en' ? (pharmacy.name_en || pharmacy.name) : pharmacy.name}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black text-white mt-1.5"
                        style={{ backgroundColor: themeColors.inStockColor }}
                      >
                        <BadgeCheck className="w-2.5 h-2.5" />
                        {t('مرخصة')}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Rating */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('التقييم')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(pharmacy.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <span className="text-sm font-black text-gray-900 ms-1">{pharmacy.rating.toFixed(1)}</span>
                      {maxRating != null && pharmacy.rating === maxRating && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-black text-amber-700">
                          <Award className="w-2.5 h-2.5" />
                          {t('الأعلى تقييماً')}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Distance */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('المسافة منك')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    {pharmacy.distance != null && minDist != null && pharmacy.distance === minDist ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-sky-600">
                          <Navigation className="w-4 h-4 animate-pulse" />
                          <span dir="ltr">{formatDistance(pharmacy.distance, lang)}</span>
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[9px] font-black text-sky-700">
                          <Navigation2 className="w-2.5 h-2.5" />
                          {t('الأقرب')}
                        </span>
                      </div>
                    ) : pharmacy.distance != null ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-sky-600">
                        <Navigation className="w-4 h-4 animate-pulse" />
                        <span dir="ltr">{formatDistance(pharmacy.distance, lang)}</span>
                      </span>
                    ) : locationLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin align-middle" />
                    ) : (
                      <button
                        type="button"
                        onClick={requestLocation}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-[10px] font-extrabold text-sky-700 hover:bg-sky-100 active:scale-95 transition-all"
                      >
                        <Crosshair className="w-3 h-3" />
                        {t('تحديد موقعي')}
                      </button>
                    )}
                  </td>
                ))}
              </tr>

              {/* Location */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('المنطقة')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <span className="inline-flex items-center justify-center gap-1 text-sm font-bold text-gray-700">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.primaryColor }} />
                      <span>{pharmacy.area || pharmacy.city || pharmacy.address}</span>
                    </span>
                  </td>
                ))}
              </tr>

              {/* Delivery */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('التوصيل')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    {pharmacy.delivery_available ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-sm font-extrabold text-teal-600">
                          <Truck className="w-4 h-4" />
                          {t('متاح')}
                          {pharmacy.delivery_fee > 0 && (
                            <span className="text-[10px] font-bold text-gray-400">({t('{0} ج.م', [pharmacy.delivery_fee.toFixed(0)])})</span>
                          )}
                        </span>
                        {deliveryOnly && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[9px] font-black text-teal-700">
                            <Truck className="w-2.5 h-2.5" />
                            {t('الوحيد المتاح للتوصيل')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-300">{t('غير متاح')}</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* 24h */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('طوارئ 24/7')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <BoolRow value={pharmacy.is_24h} />
                  </td>
                ))}
              </tr>

              {/* Insurance */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('تأمين صحي')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <BoolRow value={pharmacy.accept_insurance} />
                  </td>
                ))}
              </tr>

              {/* Parking */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('موقف')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <BoolRow value={pharmacy.has_parking} />
                  </td>
                ))}
              </tr>

              {/* Actions */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4 text-xs font-black text-gray-500">{t('التواصل')}</td>
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s align-middle" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <div className="flex items-center justify-center gap-2">
                      {pharmacy.phone && (
                        <a
                          href={`tel:${pharmacy.phone}`}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                          style={{ borderColor: `${themeColors.primaryColor}33` }}
                          title={t('اتصال سريع')}
                        >
                          <Phone className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
                        </a>
                      )}
                      {pharmacy.whatsapp && (
                        <a
                          href={buildWhatsAppLink(pharmacy.whatsapp, t('مرحباً، أحتاج الاستفسار عن متوفر عندكم'))}
                          target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                          style={{
                            backgroundColor: `${themeColors.priceColor}15`,
                            color: themeColors.priceColor,
                            borderColor: `${themeColors.primaryColor}33`,
                          }}
                          title={t('واتساب')}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      <a
                        href={getDirectionsUrl({ latitude: pharmacy.latitude, longitude: pharmacy.longitude })}
                        target="_blank" rel="noopener noreferrer"
                        className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm"
                        title={t('الاتجاهات')}
                      >
                        <Navigation2 className="w-4 h-4 text-sky-600" />
                      </a>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Browse CTA */}
              <tr className="border-t" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                <td className="p-4" />
                {withDist.map((pharmacy) => (
                  <td key={pharmacy.id} className="p-4 text-center border-s" style={{ borderColor: 'rgba(100,116,139,0.15)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate({ name: 'pharmacy', id: pharmacy.id });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all hover:brightness-110 hover:shadow-lg active:scale-95 w-full justify-center"
                      style={{ backgroundColor: themeColors.primaryColor }}
                    >
                      <Store className="w-3.5 h-3.5" />
                      {t('تصفح الأدوية')}
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer hint */}
        {compareList.length >= 2 && (
          <div
            className="px-5 py-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-400"
            style={{ backgroundColor: themeColors.sectionAltBg }}
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
            {t('جميع الصيدليات مرخصة ومصرح لها من هيئة الدواء')}
          </div>
        )}
      </div>
    </div>
  );
}
