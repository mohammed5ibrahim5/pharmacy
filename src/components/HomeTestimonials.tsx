import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Quote, BadgeCheck, MessageSquareQuote, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { localizedDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/types';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #0d9488, #0f766e)',
  'linear-gradient(135deg, #3b82f6, #6366f1)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #10b981, #059669)',
];

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? 'fill-current' : ''}`}
          style={{ color: s <= rating ? color : '#e2e8f0' }}
        />
      ))}
    </div>
  );
}

export function HomeTestimonials() {
  const { themeColors } = useSettings();
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(9);
      if (!cancelled) {
        setReviews((data || []) as Review[]);
        setLoading(false);
      }
    };
    fetchReviews();
    return () => { cancelled = true; };
  }, []);

  const goNext = useCallback(() => {
    if (reviews.length === 0) return;
    setActiveIndex((i) => (i + 1) % reviews.length);
  }, [reviews.length]);

  const goPrev = useCallback(() => {
    if (reviews.length === 0) return;
    setActiveIndex((i) => (i - 1 + reviews.length) % reviews.length);
  }, [reviews.length]);

  // Auto-scroll every 4s
  useEffect(() => {
    if (isPaused || reviews.length <= 1) return;
    intervalRef.current = setInterval(goNext, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [goNext, isPaused, reviews.length]);

  const average = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  // Show 3 at a time on desktop
  const visibleReviews = reviews.length > 0
    ? [0, 1, 2].map((offset) => reviews[(activeIndex + offset) % reviews.length])
    : [];

  return (
    <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold mb-3"
          style={{ backgroundColor: `${themeColors.badgePillBg || themeColors.primaryColor}15`, color: themeColors.badgePillText || themeColors.primaryColor }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          {t('آراء عملائنا')}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
          {t('ماذا قالوا عنا؟')}
        </h2>
        <p className="text-sm text-slate-500 mt-2 font-medium">
          {t('آراء حقيقية يشاركها عملاؤنا بعد تجربة الطلب')}
        </p>

        {reviews.length > 0 && !loading && (
          <div
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-2xl mt-4 border"
            style={{
              backgroundColor: `${themeColors.ratingColor}12`,
              borderColor: `${themeColors.ratingColor}25`,
            }}
          >
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-current" style={{ color: themeColors.ratingColor }} />
              ))}
            </div>
            <span className="text-lg font-black" style={{ color: themeColors.ratingColor }}>{average.toFixed(1)}</span>
            <span className="text-xs font-bold text-slate-500">({t('{0} تقييم حقيقي', [reviews.length])})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-200/80 p-6 h-56 skeleton" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div
          className="rounded-3xl border border-dashed border-slate-200 p-12 text-center max-w-2xl mx-auto"
          style={{ backgroundColor: themeColors.cardBg }}
        >
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${themeColors.primaryColor}12`, color: themeColors.primaryColor }}
          >
            <MessageSquareQuote className="w-8 h-8" />
          </div>
          <h3 className="font-black text-lg mb-1.5 text-slate-900">{t('كن أول من يقيّمنا')}</h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            {t('لم تصلنا تقييمات بعد — جرّب طلب دوائك وشاركنا تجربتك')}
          </p>
        </div>
      ) : (
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Desktop: 3-column carousel */}
          <div className="hidden md:grid grid-cols-3 gap-5 transition-all duration-500">
            {visibleReviews.map((review, i) => (
              <ReviewCard key={`${review.id}-${activeIndex}-${i}`} review={review} index={i} themeColors={themeColors} lang={lang} t={t} />
            ))}
          </div>

          {/* Mobile: single card */}
          <div className="md:hidden">
            {reviews[activeIndex] && (
              <ReviewCard review={reviews[activeIndex]} index={0} themeColors={themeColors} lang={lang} t={t} />
            )}
          </div>

          {/* Navigation */}
          {reviews.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={goPrev}
                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-white transition-all shadow-sm hover:shadow-md"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {reviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === activeIndex ? 24 : 8,
                      height: 8,
                      backgroundColor: i === activeIndex ? themeColors.primaryColor : '#e2e8f0',
                    }}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-white transition-all shadow-sm hover:shadow-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ReviewCard({
  review,
  index,
  themeColors,
  lang,
  t,
}: {
  review: Review;
  index: number;
  themeColors: ReturnType<typeof useSettings>['themeColors'];
  lang: string;
  t: (key: string, vars?: unknown[]) => string;
}) {
  return (
    <div
      className="relative rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group bg-white animate-fade-up overflow-hidden"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Quote icon watermark */}
      <Quote
        className="absolute top-4 start-4 w-10 h-10 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"
        style={{ color: themeColors.primaryColor }}
        fill="currentColor"
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 start-0 end-0 h-1 rounded-t-3xl"
        style={{
          background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length],
        }}
      />

      {/* Stars */}
      <div className="flex items-center gap-1 mb-4 mt-1">
        <StarRating rating={review.rating} color={themeColors.ratingColor} />
        <span className="text-xs font-bold text-slate-400 ms-1">{review.rating}.0</span>
      </div>

      {/* Comment */}
      <p className="text-sm leading-relaxed font-medium text-slate-600 mb-5 line-clamp-3">
        "{review.comment || t('تجربة ممتازة، شكراً على سرعة التوصيل والاهتمام.')}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100/80">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0"
          style={{ background: AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length] }}
        >
          {(review.customer_name || t('عميل')).charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold flex items-center gap-1.5 truncate text-slate-900">
            {review.customer_name || t('عميل')}
            <BadgeCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
          </p>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">
            {localizedDate(review.created_at, lang, { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
