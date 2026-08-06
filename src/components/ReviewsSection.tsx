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
  const { settings } = useSettings();
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
    <div className="mt-10 bg-white rounded-3xl border border-gray-100 p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5" style={{ color: settings.primary_color }} />
            تقييمات العملاء
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-1">آراء حقيقية من عملاء صيدلية {pharmacyName}</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="font-black text-amber-700">{average.toFixed(1)}</span>
            <span className="text-xs text-amber-600 font-bold">({reviews.length} تقييم)</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 bg-slate-50/70 rounded-2xl border border-dashed border-gray-200">
          <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-500">لا توجد تقييمات بعد — كن أول من يقيّم هذه الصيدلية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="bg-slate-50/70 rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: settings.primary_color }}>
                    {review.customer_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-gray-800">{review.customer_name}</p>
                    <p className="text-[10px] text-gray-400">{new Date(review.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-gray-600 leading-relaxed font-medium mt-2">{review.comment}</p>
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
              <p className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                <PencilLine className="w-4 h-4" style={{ color: settings.primary_color }} />
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
                      className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
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
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 resize-none"
              style={{ ['--tw-ring-color' as string]: settings.primary_color }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 shadow-md"
              style={{ backgroundColor: settings.primary_color }}
            >
              <Send className="w-4 h-4" />
              {submitting ? 'جاري النشر...' : 'نشر التقييم'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl border border-gray-100 p-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
              <UserRound className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-600">
              سجّل الدخول لتتمكن من إضافة تقييمك لهذه الصيدلية
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
