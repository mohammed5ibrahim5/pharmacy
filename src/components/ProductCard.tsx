import { Tag, Pill, AlertCircle, CheckCircle2, Truck, ShoppingCart, Heart, Store, Phone, Factory, FlaskConical, AlertTriangle, Scale, BellRing, BellOff, Flame, Plus, Minus } from 'lucide-react';
import type { Product, Discount } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addStockAlert, removeStockAlert } from '@/lib/loyalty';
import { PriceCompareModal } from '@/components/PriceCompareModal';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  product: Product;
  pharmacyName?: string;
  onClick?: () => void;
  popular?: boolean;
}

export function ProductCard({ product, pharmacyName, onClick, popular = false }: Props) {
  const { t } = useLanguage();
  const { themeColors, storeConfig, featuresConfig } = useSettings();
  const { cart, openOrder, addToCart, updateCartQty } = useOrder();
  const { isProductFavorite, toggleProductFavorite } = useFavorites();
  const { user } = useAuth();
  const [compareOpen, setCompareOpen] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const addTimer = useRef<number | null>(null);
  const heartTimer = useRef<number | null>(null);
  const isFav = isProductFavorite(product.id);
  const cartEntry = storeConfig.purchasesEnabled ? cart.find((i) => i.product.id === product.id) : undefined;

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

  const handleToggleFavorite = () => {
    toggleProductFavorite(product.id);
    setHeartPop(true);
    if (heartTimer.current) window.clearTimeout(heartTimer.current);
    heartTimer.current = window.setTimeout(() => setHeartPop(false), 500);
  };

  return (
    <div
      onClick={handleClick}
      className="group rounded-3xl border overflow-hidden hover:-translate-y-2 active:scale-[0.98] transition-all duration-300 cursor-pointer flex flex-col justify-between will-change-transform"
      style={{ backgroundColor: themeColors.cardBg, borderColor: `${themeColors.cardHoverBorder}33` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = themeColors.cardHoverBorder;
        e.currentTarget.style.boxShadow = `0 20px 40px -12px ${themeColors.cardHoverBorder}44, 0 8px 20px -8px ${themeColors.cardHoverBorder}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${themeColors.cardHoverBorder}33`;
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div>
        {/* Product Image Box */}
        <div className="h-40 bg-gray-50/80 relative overflow-hidden flex items-center justify-center p-3 border-b border-gray-100">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              decoding="async"
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
              className="absolute top-2.5 end-2.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-md animate-pulse whitespace-nowrap z-10"
              style={{ backgroundColor: themeColors.discountBadgeBg, color: themeColors.discountBadgeText }}
            >
              {t('خصم {0}%', [activeDiscount.discount_percentage])}
            </div>
          )}

          {/* Most-requested Badge */}
          {popular && (
            <div
              className="absolute top-10 end-2.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-md inline-flex items-center gap-1"
              style={{ backgroundColor: themeColors.accentColor, color: '#ffffff' }}
            >
              <Flame className="w-3 h-3" fill="currentColor" />
              {t('الأكثر طلباً')}
            </div>
          )}

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite();
            }}
            className={`absolute top-2.5 start-2.5 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg border transition-all duration-300 group-hover:scale-110 active:scale-90 ${
              isFav ? 'bg-pink-500 border-pink-400' : 'bg-white/90 backdrop-blur-sm border-gray-100 hover:bg-white'
            }`}
            title={isFav ? t('إزالة من المفضلة') : t('أضف إلى المفضلة')}
            aria-label={isFav ? t('إزالة من المفضلة') : t('أضف إلى المفضلة')}
          >
            <Heart
              className={`w-[18px] h-[18px] transition-all ${
                heartPop ? 'animate-heart-pop' : ''
              } ${isFav ? 'fill-white text-white scale-110' : 'fill-transparent text-pink-500'}`}
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
              className="absolute top-2.5 start-12 w-9 h-9 rounded-2xl bg-white/90 backdrop-blur-sm border border-gray-100 shadow-lg hover:bg-white flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-90"
              title={t('قارن الأسعار والبدائل')}
              aria-label={t('قارن الأسعار والبدائل')}
            >
              <Scale className="w-[18px] h-[18px]" style={{ color: themeColors.accent2Color }} />
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
              className={`absolute bottom-2.5 end-2.5 w-9 h-9 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 active:scale-90 ${
                alerted
                  ? 'text-white'
                  : 'bg-white/90 backdrop-blur-sm border border-gray-100 hover:bg-white'
              }`}
              style={alerted ? { backgroundColor: themeColors.priceColor } : { color: themeColors.accentColor }}
              title={alerted ? t('تم الاشتراك — سنخبرك عند التوفر') : t('نبهني عند توفر الدواء')}
              aria-label={t('نبهني عند توفر الدواء')}
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
              <span className="text-white font-bold text-xs px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/20">{t('غير متوفر حالياً')}</span>
            </div>
          )}

          {product.requires_prescription && (
            <div className="absolute bottom-2 end-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow">
              <AlertCircle className="w-3 h-3" />
              {t('بوصفة طبية')}
            </div>
          )}

          {/* Quick Add / Quantity Stepper / Contact Button */}
          {storeConfig.purchasesEnabled ? (
            cartEntry ? (
              <div
                className="absolute bottom-2.5 start-2.5 flex items-center gap-0.5 rounded-xl bg-white shadow-lg border p-0.5 animate-fade-in"
                style={{ borderColor: `${themeColors.priceColor}35` }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => updateCartQty(cartEntry.key, cartEntry.quantity - 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90"
                  style={{ color: themeColors.priceColor }}
                  title={t('إنقاص الكمية')}
                  aria-label={t('إنقاص الكمية')}
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                <span
                  className="min-w-[1.6rem] text-center text-xs font-black"
                  style={{ color: themeColors.priceColor }}
                >
                  {cartEntry.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateCartQty(cartEntry.key, cartEntry.quantity + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:brightness-110 text-white"
                  style={{ backgroundColor: themeColors.priceColor }}
                  title={t('زيادة الكمية')}
                  aria-label={t('زيادة الكمية')}
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <div className="absolute bottom-2.5 start-2.5">
                {justAdded && (
                  <span
                    className="pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2 text-xs font-black animate-cart-add"
                    style={{ color: themeColors.priceColor }}
                  >
                    +1
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product, pharmacyName);
                    setJustAdded(true);
                    if (addTimer.current) window.clearTimeout(addTimer.current);
                    addTimer.current = window.setTimeout(() => setJustAdded(false), 900);
                  }}
                  className="w-9 h-9 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-90"
                  style={{ color: themeColors.priceColor }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColors.priceColor; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = themeColors.priceColor; }}
                  title={t('أضف إلى السلة')}
                  aria-label={t('أضف إلى السلة')}
                >
                  <ShoppingCart className="w-[18px] h-[18px]" />
                </button>
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openOrder(product, pharmacyName);
              }}
              className="absolute bottom-2.5 start-2.5 w-9 h-9 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              style={{ color: themeColors.priceColor }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColors.priceColor; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = themeColors.priceColor; }}
              title={t('تواصل مع الصيدلية')}
              aria-label={t('تواصل مع الصيدلية')}
            >
              <Phone className="w-4 h-4" />
            </button>
          )}
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

          {product.is_available && (
            <p
              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full"
              style={{
                color: themeColors.inStockColor,
                backgroundColor: `${themeColors.inStockColor}12`,
                border: `1px solid ${themeColors.inStockColor}25`,
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              {t('متاح الآن')}
            </p>
          )}

          {product.for_all_pharmacies ? (
            <p className="text-[11px] font-semibold flex items-center gap-1 truncate" style={{ color: themeColors.priceColor }}>
              <Store className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.priceColor }} />
              <span className="truncate">{t('متوفر في جميع الصيدليات')}</span>
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
              <span className="text-xs font-bold" style={{ color: themeColors.cardMutedText }}>EGP</span>
            </div>
            {activeDiscount && (
              <span className="text-xs line-through font-medium" style={{ color: themeColors.cardMutedText }}>
                {product.price.toFixed(2)} EGP
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {typeof product.stock_quantity === 'number' && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
              <span className="flex items-center gap-1 text-[10px] font-extrabold border px-2 py-0.5 rounded-lg"
                style={{ color: themeColors.accentColor, backgroundColor: `${themeColors.accentColor}15`, borderColor: `${themeColors.accentColor}30` }}>
                <AlertTriangle className="w-3 h-3" />
                {t('كمية محدودة')}
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
