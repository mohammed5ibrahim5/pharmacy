import { MapPin, Star, Phone, Clock, Truck, MessageCircle, ArrowLeft, Navigation, ShieldCheck, Car, BadgeCheck, Heart, Navigation2 } from 'lucide-react';
import type { Pharmacy } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useCustomer } from '@/context/CustomerContext';
import { formatDistance } from '@/lib/distance';
import { getDirectionsUrl } from '@/lib/directions';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  pharmacy: Pharmacy & { distance?: number };
}

function RatingBar({ rating }: { rating: number }) {
  const pct = (rating / 5) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #f59e0b, #f97316)',
          }}
        />
      </div>
      <span className="text-[11px] font-black text-amber-600 tabular-nums">{rating.toFixed(1)}</span>
    </div>
  );
}

export function PharmacyCard({ pharmacy }: Props) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { user, setAuthModalOpen } = useCustomer();
  const { isPharmacyFavorite, togglePharmacyFavorite } = useFavorites();
  const isFav = isPharmacyFavorite(pharmacy.id);

  const handleToggleFavorite = () => {
    if (!user) { setAuthModalOpen(true); return; }
    togglePharmacyFavorite(pharmacy.id);
  };

  return (
    <div
      onClick={() => navigate({ name: 'pharmacy', id: pharmacy.id })}
      className="group rounded-3xl border overflow-hidden shadow-sm hover:-translate-y-2.5 active:scale-[0.98] transition-all duration-350 cursor-pointer flex flex-col justify-between relative will-change-transform"
      style={{
        backgroundColor: themeColors.cardBg,
        borderColor: 'rgba(100, 116, 139, 0.22)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = themeColors.pharmacyHoverBorder;
        e.currentTarget.style.boxShadow = `0 24px 48px -10px ${themeColors.pharmacyHoverBorder}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(100, 116, 139, 0.22)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div>
        {/* Cover Header */}
        <div
          className="h-40 relative overflow-hidden"
          style={{
            background: pharmacy.cover_url
              ? `url(${pharmacy.cover_url}) center/cover`
              : `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})`,
          }}
        >
          {pharmacy.cover_url && (
            <img
              src={pharmacy.cover_url}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/25 to-transparent" />

          {/* Top-Left: Delivery + Open Badge */}
          <div className="absolute top-3 start-3 flex items-center gap-1.5 z-10">
            {pharmacy.delivery_available && (
              <div
                className="backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-lg border"
                style={{ backgroundColor: `${themeColors.priceColor}dd`, borderColor: `${themeColors.priceColor}55` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <Truck className="w-3.5 h-3.5" />
                <span>{t('توصيل')}</span>
              </div>
            )}
          </div>

          {/* Distance badge */}
          {pharmacy.distance != null && (
            <div className="absolute bottom-3 end-3 bg-slate-950/80 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-lg z-10">
              <Navigation className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span dir="ltr">{formatDistance(pharmacy.distance, lang)}</span>
            </div>
          )}

          {/* Favorite Heart */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleToggleFavorite(); }}
            className={`absolute top-3 end-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all duration-300 z-10 active:scale-90 ${
              isFav
                ? 'bg-pink-500 border-pink-400'
                : 'bg-white/90 backdrop-blur-md border-white/40 hover:bg-white'
            }`}
            title={isFav ? t('إزالة من الصيدليات المفضلة') : t('أضف الصيدلية إلى المفضلة')}
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                isFav ? 'fill-white text-white scale-110 animate-heart-pop' : 'fill-transparent text-pink-500'
              }`}
            />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 pt-0 relative">
          <div className="flex items-start gap-3">
            {/* Pharmacy Logo */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 -mt-8 border-4 border-white shadow-xl overflow-hidden bg-white relative z-10"
              style={{ backgroundColor: themeColors.primaryColor }}
            >
              {pharmacy.logo_url ? (
                <img src={pharmacy.logo_url} alt={pharmacy.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-2xl">{pharmacy.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  className="font-black text-base sm:text-lg truncate transition-colors"
                  style={{ color: themeColors.cardText }}
                >
{lang === 'en' ? (pharmacy.name_en || t(pharmacy.name)) : pharmacy.name}
                </h3>
                <span
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-sm"
                  style={{ backgroundColor: themeColors.inStockColor }}
                  title={t('صيدلية مرخصة ومعتمدة')}
                >
                  <BadgeCheck className="w-3 h-3" />
                  {t('مرخصة')}
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold mt-0.5" style={{ color: themeColors.cardMutedText }}>
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.primaryColor }} />
                <span className="truncate">{pharmacy.area || pharmacy.city || pharmacy.address}</span>
              </div>

              {/* Rating bar */}
              <div className="mt-2">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${s <= Math.round(pharmacy.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                    />
                  ))}
                </div>
                <RatingBar rating={pharmacy.rating} />
              </div>
            </div>
          </div>

          {pharmacy.description && (
            <p className="text-xs mt-3 line-clamp-2 leading-relaxed font-medium" style={{ color: themeColors.cardMutedText }}>
              {pharmacy.description}
            </p>
          )}

          {/* Service Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {pharmacy.is_24h && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border"
                style={{
                  backgroundColor: `${themeColors.primaryColor}10`,
                  color: themeColors.primaryColor,
                  borderColor: `${themeColors.primaryColor}30`,
                }}
              >
                <Clock className="w-3 h-3" />
                {t('طوارئ 24/7')}
              </span>
            )}
            {pharmacy.accept_insurance && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border"
                style={{
                  backgroundColor: `${themeColors.accentColor}12`,
                  color: themeColors.accentColor,
                  borderColor: `${themeColors.accentColor}30`,
                }}
              >
                <ShieldCheck className="w-3 h-3" />
                {t('تأمين صحي')}
              </span>
            )}
            {pharmacy.has_parking && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                style={{
                  backgroundColor: `${themeColors.secondaryColor}0d`,
                  color: themeColors.secondaryColor,
                  borderColor: `${themeColors.secondaryColor}28`,
                }}
              >
                <Car className="w-3 h-3" />
                {t('موقف')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div
        className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between"
        style={{ backgroundColor: themeColors.sectionAltBg }}
      >
        <div className="flex items-center gap-2">
          {pharmacy.phone && (
            <a
              href={`tel:${pharmacy.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
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
              onClick={(e) => e.stopPropagation()}
              className="w-9 h-9 rounded-xl border flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
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
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
            title={t('الاتجاهات')}
          >
            <Navigation2 className="w-4 h-4 text-sky-600" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => navigate({ name: 'pharmacy', id: pharmacy.id })}
          className="ripple-btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all active:scale-95 hover:brightness-110 hover:shadow-lg"
          style={{ backgroundColor: themeColors.primaryColor }}
        >
          <span>{t('تصفح الأدوية')}</span>
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>
    </div>
  );
}
