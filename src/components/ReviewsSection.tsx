import { useState, useEffect } from 'react';
import { Star, MessageSquareQuote, Send, UserRound, PencilLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import type { Review } from '@/types';

interface Props {
  pharmacyId: string;
  pharmacyName: string;
}

export function ReviewsSection({ pharmacyId, pharmacyName }: Props) {
  const { settings, themeColors } = useSettings();
  const { user } = useCustomer();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });
    setReviews((data || []) as Review[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacyId]);

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    await supabase.from('reviews').insert({
      pharmacy_id: pharmacyId,
      customer_id: user.id,
      customer_name: user.full_name || 'عميل',
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    setComment('');
    setRating(5);
    await fetchReviews();
  };

  return (
    <div className="mt-10 rounded-3xl border border-gray-100 p-5 sm:p-7" style={{ backgroundColor: themeColors.cardBg }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2" style={{ color: themeColors.cardText }}>
            <MessageSquareQuote className="w-5 h-5" style={{ color: themeColors.priceColor }} />
            تقييمات العملاء
          </h2>
          <p className="text-xs font-medium mt-1" style={{ color: themeColors.cardMutedText }}>آراء حقيقية من عملاء صيدلية {pharmacyName}</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 border px-4 py-2 rounded-2xl"
            style={{ backgroundColor: `${themeColors.ratingColor}18`, borderColor: `${themeColors.ratingColor}30` }}>
            <Star className="w-5 h-5 fill-current" style={{ color: themeColors.ratingColor }} />
            <span className="font-black" style={{ color: themeColors.ratingColor }}>{average.toFixed(1)}</span>
            <span className="text-xs font-bold" style={{ color: themeColors.ratingColor }}>({reviews.length} تقييم)</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border border-dashed border-gray-200" style={{ backgroundColor: themeColors.sectionAltBg }}>
          <Star className="w-8 h-8 mx-auto mb-2" style={{ color: themeColors.cardMutedText }} />
          <p className="text-sm font-bold" style={{ color: themeColors.cardMutedText }}>لا توجد تقييمات بعد — كن أول من يقيّم هذه الصيدلية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-gray-100 p-4" style={{ backgroundColor: themeColors.sectionAltBg }}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: themeColors.priceColor }}>
                    {review.customer_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold" style={{ color: themeColors.cardText }}>{review.customer_name}</p>
                    <p className="text-[10px]" style={{ color: themeColors.cardMutedText }}>{new Date(review.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4"
                      style={{ color: star <= review.rating ? themeColors.ratingColor : themeColors.cardMutedText, fill: star <= review.rating ? themeColors.ratingColor : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm leading-relaxed font-medium mt-2" style={{ color: themeColors.cardText }}>{review.comment}</p>
              )}
              {(review.delivery_rating || review.product_quality_rating || review.value_rating) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-gray-100">
                  {typeof review.delivery_rating === 'number' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: themeColors.cardMutedText }}>
                      التوصيل
                      <span className="flex items-center gap-0.5" dir="ltr">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3 h-3" style={{ color: s <= review.delivery_rating! ? themeColors.ratingColor : themeColors.cardMutedText, fill: s <= review.delivery_rating! ? themeColors.ratingColor : 'transparent' }} />
                        ))}
                      </span>
                    </span>
                  )}
                  {typeof review.product_quality_rating === 'number' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: themeColors.cardMutedText }}>
                      الجودة
                      <span className="flex items-center gap-0.5" dir="ltr">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3 h-3" style={{ color: s <= review.product_quality_rating! ? themeColors.ratingColor : themeColors.cardMutedText, fill: s <= review.product_quality_rating! ? themeColors.ratingColor : 'transparent' }} />
                        ))}
                      </span>
                    </span>
                  )}
                  {typeof review.value_rating === 'number' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: themeColors.cardMutedText }}>
                      القيمة
                      <span className="flex items-center gap-0.5" dir="ltr">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3 h-3" style={{ color: s <= review.value_rating! ? themeColors.ratingColor : themeColors.cardMutedText, fill: s <= review.value_rating! ? themeColors.ratingColor : 'transparent' }} />
                        ))}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add review */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold flex items-center gap-1.5" style={{ color: themeColors.cardText }}>
                <PencilLine className="w-4 h-4" style={{ color: themeColors.priceColor }} />
                أضف تقييمك
              </p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-125 active:scale-95"
                    aria-label={`${star} نجوم`}
                  >
                    <Star
                      className="w-6 h-6"
                      style={{ color: star <= rating ? themeColors.ratingColor : themeColors.cardMutedText, fill: star <= rating ? themeColors.ratingColor : 'transparent' }}
                    />
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="شارك تجربتك مع هذه الصيدلية (اختياري)..."
              className="w-full p-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ backgroundColor: themeColors.pageSearchBg, color: themeColors.pageSearchText, ['--tw-ring-color' as string]: themeColors.priceColor }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 shadow-md"
              style={{ backgroundColor: themeColors.priceColor }}
            >
              <Send className="w-4 h-4" />
              {submitting ? 'جاري النشر...' : 'نشر التقييم'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4" style={{ backgroundColor: themeColors.sectionAltBg }}>
            <div className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center shrink-0" style={{ backgroundColor: themeColors.cardBg, color: themeColors.cardMutedText }}>
              <UserRound className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold" style={{ color: themeColors.cardText }}>
              سجّل الدخول لتتمكن من إضافة تقييمك لهذه الصيدلية
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
