import { useState } from 'react';
import { X, Star, Send, MessageSquareQuote, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  orderId: string;
  pharmacyId: string;
  pharmacyName: string;
  productName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function OrderReviewModal({ orderId, pharmacyId, pharmacyName, productName, onClose, onSubmitted }: Props) {
  const { themeColors } = useSettings();
  const { user, profile } = useCustomer();
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const starRow = (current: number, set: (n: number) => void, size?: string) => (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => set(star)}
          className="transition-transform hover:scale-125 active:scale-95"
          aria-label={t('{0} نجوم', [star])}
        >
          <Star
            className={`${size || 'w-6 h-6'} ${star <= current ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    await supabase.from('reviews').insert({
      pharmacy_id: pharmacyId,
      customer_id: user.id,
      customer_name: profile?.full_name || user.full_name || t('عميل'),
      rating,
      comment: comment.trim() || null,
      order_id: orderId,
      delivery_rating: deliveryRating,
      product_quality_rating: qualityRating,
      value_rating: valueRating,
    });
    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 rounded-t-3xl" style={{ backgroundColor: themeColors.modalHeaderBg }}>
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5" style={{ color: themeColors.priceColor }} />
            <h2 className="font-black" style={{ color: themeColors.modalHeaderText }}>{t('قيّم طلبك')}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-3.5">
                <p className="text-sm font-black text-gray-800 mb-0.5">{productName}</p>
                <p className="text-[11px] text-gray-400">{t('من صيدلية {0}', [pharmacyName])}</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-gray-800">{t('تقييمك العام')}</p>
                  <p className="text-[10px] text-gray-400">{t('رأيك في التجربة كاملة')}</p>
                </div>
                {starRow(rating, setRating)}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-gray-500 mb-1.5">{t('سرعة التوصيل')}</p>
                  {starRow(deliveryRating, setDeliveryRating, 'w-4 h-4')}
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-gray-500 mb-1.5">{t('جودة المنتج')}</p>
                  {starRow(qualityRating, setQualityRating, 'w-4 h-4')}
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-gray-500 mb-1.5">{t('القيمة مقابل السعر')}</p>
                  {starRow(valueRating, setValueRating, 'w-4 h-4')}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 mb-1.5">{t('تعليقك (اختياري)')}</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder={t('شارك تجربتك مع هذا الطلب...')}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 rounded-2xl text-white text-sm font-black flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 shadow-md"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? t('جاري النشر...') : t('نشر التقييم')}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
