import { Tag, Pill, AlertCircle, CheckCircle2, Truck, Plus, Heart, Store } from 'lucide-react';
import type { Product, Discount } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useOrder } from '@/context/OrderContext';
import { useFavorites } from '@/context/FavoritesContext';

interface Props {
  product: Product;
  pharmacyName?: string;
  onClick?: () => void;
}

export function ProductCard({ product, pharmacyName, onClick }: Props) {
  const { settings } = useSettings();
  const { openOrder } = useOrder();
  const { isProductFavorite, toggleProductFavorite } = useFavorites();
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
      className="group bg-white rounded-3xl border border-gray-200/80 overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 hover:border-teal-300 transition-all duration-300 cursor-pointer flex flex-col justify-between"
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
              style={{ background: `linear-gradient(135deg, ${settings.primary_color}10, ${settings.secondary_color}15)` }}
            >
              <Pill
                className="w-10 h-10"
                style={{ color: settings.primary_color, opacity: 0.4 }}
              />
              <span className="text-[11px] font-bold text-gray-500 line-clamp-1">
                {product.name}
              </span>
            </div>
          )}

          {/* Badges Overlay */}
          {activeDiscount && (
            <div
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white shadow-md animate-pulse"
              style={{ backgroundColor: settings.accent_color || '#d97706' }}
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

          {/* Quick Buy Plus Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openOrder(product, pharmacyName);
            }}
            className="absolute bottom-2.5 left-2.5 w-9 h-9 rounded-2xl bg-white shadow-lg text-teal-700 hover:bg-teal-600 hover:text-white flex items-center justify-center transition-all duration-300 group-hover:scale-105"
            title="اطلب الدواء الآن"
          >
            <Plus className="w-5 h-5 font-bold" />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-extrabold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors min-h-[2.4rem]">
            {product.name}
          </h3>

          {product.for_all_pharmacies ? (
            <p className="text-[11px] font-semibold text-teal-700 flex items-center gap-1 truncate">
              <Store className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">متوفر في جميع الصيدليات</span>
            </p>
          ) : (
            pharmacyName && (
              <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 truncate">
                <Truck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">{pharmacyName}</span>
              </p>
            )
          )}

          {product.description && (
            <p className="text-[11px] text-gray-500 line-clamp-1 font-medium">{product.description}</p>
          )}
        </div>
      </div>

      {/* Pricing & Unit */}
      <div className="p-4 pt-0">
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-black text-xl text-teal-700">
                {finalPrice.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-gray-500">ج.م</span>
            </div>
            {activeDiscount && (
              <span className="text-xs text-gray-400 line-through font-medium">
                {product.price.toFixed(2)} ج.م
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">
            {product.is_available ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            ) : (
              <Tag className="w-3.5 h-3.5" />
            )}
            <span>{product.unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
