import { MapPin, Star, Phone, Clock, Truck, MessageCircle, ArrowLeft, Navigation, ShieldCheck, Car, CheckCircle2, Heart } from 'lucide-react';
import type { Pharmacy } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useFavorites } from '@/context/FavoritesContext';
import { formatDistance } from '@/lib/distance';

interface Props {
  pharmacy: Pharmacy & { distance?: number };
}

export function PharmacyCard({ pharmacy }: Props) {
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { isPharmacyFavorite, togglePharmacyFavorite } = useFavorites();
  const isFav = isPharmacyFavorite(pharmacy.id);

  return (
    <div
      onClick={() => navigate({ name: 'pharmacy', id: pharmacy.id })}
      className="group bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between relative"
      style={{
        borderColor: 'rgba(0, 0, 0, 0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = themeColors.pharmacyHoverBorder;
        e.currentTarget.style.boxShadow = `0 20px 40px -10px ${themeColors.pharmacyHoverBorder}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div>
        {/* Cover Header Banner */}
        <div
          className="h-36 relative overflow-hidden bg-slate-900"
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
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90"
            />
          )}

          {/* Dark gradient overlay for extreme readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />

          {/* Top Left: Delivery Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            {pharmacy.delivery_available && (
              <div className="bg-teal-500/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-lg border border-teal-400/30">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <Truck className="w-3.5 h-3.5" />
                <span>توصيل سريع</span>
              </div>
            )}
          </div>

          {/* Top Right: GPS Distance Badge */}
          {pharmacy.distance != null && (
            <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-white/20 text-white px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 shadow-lg z-10">
              <Navigation className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
              <span dir="ltr">{formatDistance(pharmacy.distance)}</span>
            </div>
          )}

          {/* Rating Badge on Cover Bottom Right */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-3 py-1 rounded-2xl bg-black/60 backdrop-blur-md text-white text-xs font-black shadow-md border border-white/20 z-10">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-amber-200">{pharmacy.rating}</span>
            <span className="text-[10px] text-slate-300 font-normal">/ 5.0</span>
          </div>

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePharmacyFavorite(pharmacy.id);
            }}
            className={`absolute bottom-3 left-3 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border transition-all duration-300 z-10 active:scale-90 ${
              isFav
                ? 'bg-pink-500 border-pink-400'
                : 'bg-white/90 backdrop-blur-md border-white/40 hover:bg-white'
            }`}
            title={isFav ? 'إزالة من الصيدليات المفضلة' : 'أضف الصيدلية إلى المفضلة'}
            aria-label={isFav ? 'إزالة من الصيدليات المفضلة' : 'أضف الصيدلية إلى المفضلة'}
          >
            <Heart
              className={`w-5 h-5 transition-all ${
                isFav ? 'fill-white text-white scale-110' : 'fill-transparent text-pink-500'
              }`}
            />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 pt-0 relative">
          <div className="flex items-start gap-3">
            {/* Pharmacy Logo Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 -mt-8 border-4 border-white shadow-xl overflow-hidden bg-white relative z-10"
              style={{ backgroundColor: themeColors.primaryColor }}
            >
              {pharmacy.logo_url ? (
                <img src={pharmacy.logo_url} alt={pharmacy.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-2xl">{pharmacy.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-2">
              <div className="flex items-center gap-1.5">
                <h3
                  className="font-black text-slate-900 text-base sm:text-lg truncate transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.color = themeColors.primaryColor}
                  onMouseLeave={(e) => e.currentTarget.style.color = ''}
                >
                  {pharmacy.name}
                </h3>
                <CheckCircle2 className="w-4 h-4 text-teal-500 fill-teal-100 shrink-0" aria-label="صيدلية معتمدة" role="img" />
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-500 font-bold mt-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.primaryColor }} />
                <span className="truncate">{pharmacy.area || pharmacy.city || pharmacy.address}</span>
              </div>
            </div>
          </div>

          {pharmacy.description && (
            <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed font-medium">
              {pharmacy.description}
            </p>
          )}

          {/* Service Features Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {pharmacy.is_24h && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border"
                style={{
                  backgroundColor: `${themeColors.primaryColor}10`,
                  color: themeColors.primaryColor,
                  borderColor: `${themeColors.primaryColor}30`
                }}
              >
                <Clock className="w-3 h-3" />
                متاحة 24/7 طوارئ
              </span>
            )}
            {pharmacy.accept_insurance && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border"
                style={{
                  backgroundColor: `${themeColors.accentColor}12`,
                  color: themeColors.accentColor,
                  borderColor: `${themeColors.accentColor}30`
                }}
              >
                <ShieldCheck className="w-3 h-3" />
                قبول التأمين الصحي
              </span>
            )}
            {pharmacy.has_parking && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border"
                style={{
                  backgroundColor: `${themeColors.secondaryColor}0d`,
                  color: themeColors.secondaryColor,
                  borderColor: `${themeColors.secondaryColor}28`
                }}
              >
                <Car className="w-3 h-3" />
                موقف سيارات
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {pharmacy.phone && (
            <a
              href={`tel:${pharmacy.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-all text-slate-700 shadow-2xs active:scale-95 hover:brightness-105"
              style={{
                borderColor: `${themeColors.primaryColor}33`,
              }}
              title="اتصال سريع بالصيدلية"
            >
              <Phone className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
            </a>
          )}
          {pharmacy.whatsapp && (
            <a
              href={`https://wa.me/${pharmacy.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-9 h-9 rounded-xl bg-teal-50 border flex items-center justify-center transition-all text-teal-700 shadow-2xs active:scale-95"
              style={{
                borderColor: `${themeColors.primaryColor}33`,
              }}
              title="تواصل مباشر عبر واتساب"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate({ name: 'pharmacy', id: pharmacy.id })}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-extrabold text-xs shadow-md transition-all active:scale-95 hover:brightness-110"
          style={{
            backgroundColor: themeColors.primaryColor,
          }}
        >
          <span>تصفح الأدوية</span>
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
        </button>
      </div>
    </div>
  );
}
