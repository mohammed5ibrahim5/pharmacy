import { Tag, Pill, AlertCircle, CheckCircle2, Truck, ShoppingCart, Heart, Store, FlaskConical, BellRing, BellOff, Flame, Plus, Minus, Eye } from 'lucide-react';
import type { Product, Discount } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addStockAlert, removeStockAlert } from '@/lib/loyalty';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  product: Product;
  pharmacyName?: string;
  onClick?: () => void;
  popular?: boolean;
}

export function ProductCard({ product, pharmacyName, onClick, popular = false }: Props) {
  const { t } = useLanguage();
  const { themeColors, featuresConfig } = useSettings();
  const { cart, openOrder, addToCart, updateCartQty } = useOrder();
  const { isProductFavorite, toggleProductFavorite } = useFavorites();
  const { user } = useAuth();
  const [alerting, setAlerting] = useState(false);
  const [alerted, setAlerted] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const addTimer = useRef<number | null>(null);
  const heartTimer = useRef<number | null>(null);
  const isFav = isProductFavorite(product.id);
  const cartEntry = cart.find((i) => i.product.id === product.id);

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
      className="group rounded-3xl border overflow-hidden hover:-translate-y-2 active:scale-[0.98] transition-all duration-300 cursor-pointer flex flex-col justify-between will-change-transform bg-white relative"
      style={{ borderColor: `${themeColors.cardHoverBorder}33` }}
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
        <div className="h-44 bg-gray-50/50 relative overflow-hidden flex items-center justify-center p-3 border-b border-gray-100">
          
          {/* Shimmer Effect */}
          {product.image_url && !imgLoaded && (
            <div className="absolute inset-0 skeleton z-0" />
          )}

          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; setImgLoaded(true); }}
              className={`max-h-36 w-auto object-contain transition-all duration-500 z-10 ${imgLoaded ? 'opacity-100 group-hover:scale-110' : 'opacity-0 scale-95'}`}
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

          {/* Quick View Overlay (Hover) */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col items-center justify-center gap-2">
            <button className="flex items-center gap-1.5 bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:bg-slate-50 active:scale-95">
              <Eye className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
              {t('نظرة سريعة')}
            </button>
          </div>

          {/* Badges Overlay */}
          {activeDiscount && (
            <div
              className="absolute top-2.5 end-2.5 px-3 py-1 rounded-full text-[11px] font-black shadow-md z-30 overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, #ef4444, #f43f5e)`,
                color: 'white'
              }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-full animate-[shimmer_2s_infinite]" />
              <span className="relative z-10 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {t('وفر {0}%', [activeDiscount.discount_percentage])}
              </span>
            </div>
          )}

          {/* Most-requested Badge */}
          {popular && (
            <div
              className="absolute top-10 end-2.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-md inline-flex items-center gap-1 z-30"
              style={{ backgroundColor: themeColors.accentColor, color: '#ffffff' }}
            >
              <Flame className="w-3 h-3" fill="currentColor" />
              {t('شائع')}
            </div>
          )}

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite();
            }}
            className={`absolute top-2.5 start-2.5 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg border transition-all duration-300 group-hover:scale-110 active:scale-90 z-30 ${
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

          {/* Stock Alert Button when unavailable */}
          {featuresConfig.stockAlerts && !product.is_available && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (!user) return;
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
              className={`absolute bottom-2.5 end-2.5 w-9 h-9 rounded-2xl shadow-lg flex items-center justify-center transition-all duration-300 active:scale-90 z-30 ${
                alerted
                  ? 'text-white'
                  : 'bg-white/90 backdrop-blur-sm border border-gray-100 hover:bg-white'
              }`}
              style={alerted ? { backgroundColor: themeColors.priceColor } : { color: themeColors.accentColor }}
              title={alerted ? t('تم الاشتراك — سنخبرك عند التوفر') : t('نبهني عند توفر الدواء')}
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
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-20">
              <span className="text-white font-bold text-xs px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/20">{t('نفدت الكمية')}</span>
            </div>
          )}

          {product.requires_prescription && (
            <div className="absolute bottom-2 end-2 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow z-30">
              <AlertCircle className="w-3 h-3" />
              {t('وصفة طبية')}
            </div>
          )}

          {/* Quick Add / Quantity Stepper */}
          {cartEntry ? (
              <div
                className="absolute bottom-2.5 start-2.5 flex items-center gap-0.5 rounded-xl bg-white shadow-lg border p-0.5 animate-fade-in z-30"
                style={{ borderColor: `${themeColors.priceColor}35` }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => updateCartQty(cartEntry.key, cartEntry.quantity - 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:bg-slate-50"
                  style={{ color: themeColors.priceColor }}
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
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <div className="absolute bottom-2.5 start-2.5 z-30">
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
                    const ok = addToCart(product, pharmacyName);
                    if (!ok) return;
                    setJustAdded(true);
                    if (addTimer.current) window.clearTimeout(addTimer.current);
                    addTimer.current = window.setTimeout(() => setJustAdded(false), 900);
                  }}
                  className="w-9 h-9 rounded-2xl bg-white shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-90"
                  style={{ color: themeColors.priceColor }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeColors.priceColor; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = themeColors.priceColor; }}
                  title={t('أضف إلى السلة')}
                >
                  <ShoppingCart className="w-[18px] h-[18px]" />
                </button>
              </div>
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

          <div className="flex flex-wrap gap-1.5">
            {product.is_available && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full"
                style={{
                  color: themeColors.inStockColor,
                  backgroundColor: `${themeColors.inStockColor}12`,
                  border: `1px solid ${themeColors.inStockColor}25`,
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {t('متاح')}
              </span>
            )}

            {/* Warning Stock */}
            {typeof product.stock_quantity === 'number' && product.stock_quantity > 0 && product.stock_quantity <= 5 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse"
                style={{ 
                  color: themeColors.accentColor, 
                  backgroundColor: `${themeColors.accentColor}15`, 
                  border: `1px solid ${themeColors.accentColor}30` 
                }}>
                <Flame className="w-3 h-3" />
                {t('باقي {0} قطع', [product.stock_quantity])}
              </span>
            )}
          </div>

          {product.for_all_pharmacies ? (
            <p className="text-[11px] font-semibold flex items-center gap-1 truncate" style={{ color: themeColors.priceColor }}>
              <Store className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t('جميع الصيدليات')}</span>
            </p>
          ) : (
            pharmacyName && (
              <p className="text-[11px] font-semibold flex items-center gap-1 truncate" style={{ color: themeColors.cardMutedText }}>
                <Truck className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.priceColor }} />
                <span className="truncate">{pharmacyName}</span>
              </p>
            )
          )}

          {(product.form || product.dosage) && (
            <p className="text-[11px] font-bold flex items-center gap-1 truncate" style={{ color: themeColors.cardMutedText }}>
              <FlaskConical className="w-3.5 h-3.5 shrink-0" style={{ color: themeColors.priceColor }} />
              <span className="truncate">{[product.form, product.dosage].filter(Boolean).join(' • ')}</span>
            </p>
          )}
        </div>
      </div>

      {/* Pricing & Unit */}
      <div className="p-4 pt-0">
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            {activeDiscount && (
              <span className="text-xs line-through font-medium" style={{ color: themeColors.cardMutedText }}>
                {product.price.toFixed(2)} EGP
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="font-black text-xl" style={{ color: activeDiscount ? '#ef4444' : themeColors.priceColor }}>
                {finalPrice.toFixed(2)}
              </span>
              <span className="text-xs font-bold" style={{ color: themeColors.cardMutedText }}>EGP</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg"
              style={{ color: themeColors.cardMutedText, backgroundColor: `${themeColors.cardMutedText}15` }}>
              <Tag className="w-3 h-3" />
              <span>{product.unit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
