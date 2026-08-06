import { useState } from 'react';
import { X, Star, Send, MessageSquareQuote, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';

interface Props {
  orderId: string;
  pharmacyId: string;
  pharmacyName: string;
  productName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function OrderReviewModal({ orderId, pharmacyId, pharmacyName, productName, onClose, onSubmitted }: Props) {
  const { settings, themeColors } = useSettings();
  const { user, profile } = useCustomer();
  const [rating, setRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const starRow = (current: number, set: (n: number) => void, size?: string) => (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => set(star)}
          className="transition-transform hover:scale-125 active:scale-95"
          aria-label={`${star} نجوم`}
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
      customer_name: profile?.full_name || user.full_name || 'عميل',
      rating,
      comment: comment.trim() || null,
      order_id: orderId,
      delivery_rating: deliveryRating,
      product_quality_rating: qualityRating,
      value_rating: valueRating,
    });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto" style={{ backgroundColor: themeColors.modalBodyBg }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 rounded-t-3xl" style={{ backgroundColor: themeColors.modalHeaderBg }}>
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5" style={{ color: themeColors.priceColor }} />
            <h2 className="font-black" style={{ color: themeColors.modalHeaderText }}>قيّم طلبك</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="font-black text-gray-900 mb-1">شكراً لتقييمك!</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                سيساعد تقييمك في تحسين جودة الخدمة من {pharmacyName}.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-2xl text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                إغلاق
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-3.5">
                <p className="text-sm font-black text-gray-800 mb-0.5">{productName}</p>
                <p className="text-[11px] text-gray-400">من صيدلية {pharmacyName}</p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-gray-800">تقييمك العام</p>
                  <p className="text-[10px] text-gray-400">رأيك في التجربة كاملة</p>
                </div>
                {starRow(rating, setRating)}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-gray-500 mb-1.5">سرعة التوصيل</p>
                  {starRow(deliveryRating, setDeliveryRating, 'w-4 h-4')}
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-gray-500 mb-1.5">جودة المنتج</p>
                  {starRow(qualityRating, setQualityRating, 'w-4 h-4')}
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-bold text-gray-500 mb-1.5">القيمة مقابل السعر</p>
                  {starRow(valueRating, setValueRating, 'w-4 h-4')}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 mb-1.5">تعليقك (اختياري)</p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="شارك تجربتك مع هذا الطلب..."
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
                {submitting ? 'جاري النشر...' : 'نشر التقييم'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
