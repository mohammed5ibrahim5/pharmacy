import { Tag, Pill, AlertCircle, CheckCircle2, Truck, Plus, Heart, Store, Phone, Factory, FlaskConical, AlertTriangle, Scale, BellRing, BellOff, X } from 'lucide-react';
import type { Product, Discount } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addStockAlert, removeStockAlert } from '@/lib/loyalty';
import { PriceCompareModal } from '@/components/PriceCompareModal';

interface Props {
  product: Product;
  pharmacyName?: string;
  onClick?: () => void;
}

export function ProductCard({ product, pharmacyName, onClick }: Props) {
  const { settings, themeColors, storeConfig, featuresConfig } = useSettings();
  const { openOrder } = useOrder();
  const { isProductFavorite, toggleProductFavorite } = useFavorites();
  const { user } = useAuth();
  const [compareOpen, setCompareOpen] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);
  const isFav = isProductFavorite(product.id);

  const activeDiscount = product.discounts?.find((d: Discount) => d.is_active);
  const finalPrice = activeDiscount
    ? product.price * (1 - activeDiscount.discount_percentage / 100)
    : product.price;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openOrder(product, pharmacyName);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group rounded-3xl border border-gray-200/80 overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
      style={{ backgroundColor: themeColors.cardBg, borderColor: `${themeColors.cardHoverBorder}33` }}
    >
      <div>
        {/* Product Image Box */}
        <div className="h-40 bg-gray-50/80 relative overflow-hidden flex items-center justify-center p-3 border-b border-gray-100">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              className="max-h-36 w-auto object-contain group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-1.5 p-3 text-center"
              style={{ background: `linear-gradient(135deg, ${themeColors.priceColor}10, ${themeColors.sectionAltBg}15)` }}
            >
              <Pill
                className="w-10 h-10"
                style={{ color: themeColors.priceColor, opacity: 0.4 }}
              />
              <span className="text-[11px] font-bold text-gray-500 line-clamp-1">
                {product.name}
              </span>
            </div>
          )}

          {/* Badges Overlay */}
          {activeDiscount && (
            <div
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-md animate-pulse"
              style={{ backgroundColor: themeColors.discountBadgeBg, color: themeColors.discountBadgeText }}
            >
              خصم {activeDiscount.discount_percentage}%
            </div>
          )}

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleProductFavorite(product.id);
            }}
            className={`absolute top-2.5 left-2.5 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg border transition-all duration-300 group-hover:scale-110 active:scale-90 ${
              isFav ? 'bg-pink-500 border-pink-400' : 'bg-white/90 backdrop-blur-sm border-gray-100 hover:bg-white'
            }`}
            title={isFav ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
            aria-label={isFav ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          >
            <Heart
              className={`w-[18px] h-[18px] transition-all ${
                isFav ? 'fill-white text-white scale-110' : 'fill-transparent text-pink-500'
              }`}
            />
          </button>

          {/* Compare Prices Button */}
          {featuresConfig.priceCompare && !product.for_all_pharmacies && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCompareOpen(true);
              }}
              className="absolute top-2.5 right-12 w-9 h-9 rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-100 shadow-lg hover:bg-white flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-90"
              title="قارن الأسعار والبدائل"
              aria-label="قارن الأسعار والبدائل"
            >
              <Scale className="w-[18px] h-[18px]" style={{ color: themeColors.priceColor }} />
            </button>
          )}

          {/* Stock Alert Button when unavailable */}
          {featuresConfig.stockAlerts && !product.is_available && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (!user) {
                  return;
                }
                setAlerting(true);
                try {
                  if (alerted) {
                    await removeStockAlert(user.id, product.id);
                    setAlerted(false);
                  } else {
                    await addStockAlert(user.id, product.id);
                    setAlerted(true);
                  }
                } finally {
                  setAlerting(false);
                }
              }}
              className={`absolute bottom-2.5 right-2.5 w-9 h-9 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 active:scale-90 ${
                alerted
                  ? 'text-white'
                  : 'bg-white/90 backdrop-blur-sm border border-gray-100 hover:bg-white'
              }`}
              style={alerted ? { backgroundColor: themeColors.priceColor } : { color: themeColors.accentColor }}
              title={alerted ? 'تم الاشتراك — سنخبرك عند التوفر' : 'نبهني عند توفر الدواء'}
              aria-label="نبهني عند توفر الدواء"
            >
              {alerting ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : alerted ? (
                <BellRing className="w-[18px] h-[18px]" />
              ) : (
                <BellOff className="w-[18px] h-[18px]" />
              )}
            </button>
          )}

          {!product.is_available && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
              <span className="text-white font-bold text-xs px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/20">غير متوفر حالياً</span>
            </div>
          )}

          {product.requires_prescription && (
            <div className="absolute bottom-2 right-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow">
              <AlertCircle className="w-3 h-3" />
              بوصفة طبية
            </div>
          )}

          {/* Quick Buy / Contact Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openOrder(product, pharmacyName);
            }}
            className="absolute bottom-2.5 left-2.5 w-9 h-9 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105"
            style={{ color: themeColors.priceColor }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColors.priceColor; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = themeColors.priceColor; }}
            title={storeConfig.purchasesEnabled ? 'اطلب الدواء الآن' : 'تواصل مع الصيدلية'}
          >
            {storeConfig.purchasesEnabled ? (
              <Plus className="w-5 h-5 font-bold" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-extrabold text-sm leading-snug line-clamp-2 transition-colors min-h-[2.4rem]"
            style={{ color: themeColors.cardText }}
            onMouseEnter={(e) => (e.currentTarget.style.color = themeColors.priceColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = themeColors.cardText)}
          >
            {product.name}
          </h3>

          {product.for_all_pharmacies ? (
            <p className="text-[11px] font-semibold flex items-center gap-1 truncate" style={{ color: themeColors.priceColor }}>
              <Store className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.priceColor }} />
              <span className="truncate">متوفر في جميع الصيدليات</span>
            </p>
          ) : (
            pharmacyName && (
              <p className="text-[11px] font-semibold flex items-center gap-1 truncate" style={{ color: themeColors.cardMutedText }}>
                <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.priceColor }} />
                <span className="truncate">{pharmacyName}</span>
              </p>
            )
          )}

          {product.description && (
            <p className="text-[11px] line-clamp-1 font-medium" style={{ color: themeColors.cardMutedText }}>{product.description}</p>
          )}

          {(product.form || product.dosage) && (
            <p className="text-[11px] font-bold flex items-center gap-1 truncate" style={{ color: themeColors.cardMutedText }}>
              <FlaskConical className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.priceColor }} />
              <span className="truncate">{[product.form, product.dosage].filter(Boolean).join(' • ')}</span>
            </p>
          )}

          {product.manufacturer && (
            <p className="text-[11px] flex items-center gap-1 truncate" style={{ color: themeColors.cardMutedText }}>
              <Factory className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.cardMutedText }} />
              <span className="truncate">{product.manufacturer}</span>
            </p>
          )}
        </div>
      </div>

      {/* Pricing & Unit */}
      <div className="p-4 pt-0">
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-xl" style={{ color: themeColors.priceColor }}>
                {finalPrice.toFixed(2)}
              </span>
              <span className="text-xs font-bold" style={{ color: themeColors.cardMutedText }}>ج.م</span>
            </div>
            {activeDiscount && (
              <span className="text-xs line-through font-medium" style={{ color: themeColors.cardMutedText }}>
                {product.price.toFixed(2)} ج.م
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {typeof product.stock_quantity === 'number' && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
              <span className="flex items-center gap-1 text-[10px] font-extrabold border px-2 py-0.5 rounded-lg"
                style={{ color: themeColors.accentColor, backgroundColor: `${themeColors.accentColor}15`, borderColor: `${themeColors.accentColor}30` }}>
                <AlertTriangle className="w-3 h-3" />
                كمية محدودة
              </span>
            )}
            <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg"
              style={{ color: themeColors.cardMutedText, backgroundColor: `${themeColors.cardMutedText}15` }}>
              {product.is_available ? (
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: themeColors.inStockColor }} />
              ) : (
                <Tag className="w-3.5 h-3.5" style={{ color: themeColors.outOfStockColor }} />
              )}
              <span>{product.unit}</span>
            </div>
          </div>
        </div>
      </div>

      {compareOpen && <PriceCompareModal product={product} onClose={() => setCompareOpen(false)} />}
    </div>
  );
}
