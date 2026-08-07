import { useState, useEffect } from 'react';
import { Star, Quote, BadgeCheck, MessageSquareQuote } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { localizedDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/types';

const AVATAR_COLORS = ['#0d9488', '#2563eb', '#d97706', '#7c3aed', '#db2777'];

export function HomeTestimonials() {
  const { themeColors } = useSettings();
  const { t, lang } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (!cancelled) {
        setReviews((data || []) as Review[]);
        setLoading(false);
      }
    };
    fetchReviews();
    return () => {
      cancelled = true;
    };
  }, []);

  const average =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: themeColors.sectionBg }}>
      <div className="text-center mb-10">
        <span
          className="text-xs font-extrabold px-3.5 py-1 rounded-full"
          style={{ backgroundColor: `${themeColors.badgePillBg}15`, color: themeColors.badgePillText }}
        >
          {t('آراء عملائنا')}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black mt-2" style={{ color: themeColors.sectionHeadingText }}>{t('ماذا قالوا عنا؟')}</h2>
        <p className="text-sm mt-2 font-bold" style={{ color: themeColors.sectionSubheadingText }}>
          {t('آراء حقيقية يشاركها عملاؤنا بعد تجربة الطلب')}
        </p>
        {reviews.length > 0 && !loading && (
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl mt-3"
            style={{ backgroundColor: `${themeColors.ratingColor}18`, border: `1px solid ${themeColors.ratingColor}30` }}
          >
            <Star className="w-4 h-4 fill-current" style={{ color: themeColors.ratingColor }} />
            <span className="font-black" style={{ color: themeColors.ratingColor }}>{average.toFixed(1)}</span>
            <span className="text-xs font-bold" style={{ color: themeColors.ratingColor }}>({t('{0} تقييم حقيقي', [reviews.length])})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-200/80 p-6 h-56 animate-pulse" style={{ backgroundColor: themeColors.cardBg }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center max-w-2xl mx-auto" style={{ backgroundColor: themeColors.cardBg }}>
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${themeColors.primaryColor}12`, color: themeColors.primaryColor }}
          >
            <MessageSquareQuote className="w-8 h-8" />
          </div>
          <h3 className="font-black text-lg mb-1.5" style={{ color: themeColors.cardText }}>{t('كن أول من يقيّمنا')}</h3>
          <p className="text-sm font-bold leading-relaxed" style={{ color: themeColors.cardMutedText }}>
            {t('لم تصلنا تقييمات بعد — جرّب طلب دوائك وشاركنا تجربتك، وستظهر آراء عملائنا الحقيقيين هنا.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.slice(0, 3).map((review, i) => (
            <div
              key={review.id}
              className="relative rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              style={{ backgroundColor: themeColors.cardBg }}
            >
              <Quote className="absolute top-5 start-5 w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: themeColors.primaryColor }} fill="currentColor" />

              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= review.rating ? 'fill-current' : ''}`}
                    style={{ color: s <= review.rating ? themeColors.ratingColor : themeColors.cardMutedText }}
                  />
                ))}
              </div>

              <p className="text-sm leading-relaxed font-medium mb-5" style={{ color: themeColors.cardMutedText }}>
                {review.comment || t('تجربة ممتازة، شكراً على سرعة التوصيل.')}
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0"
                  style={{ background: `linear-gradient(135deg, ${AVATAR_COLORS[i % AVATAR_COLORS.length]}, ${themeColors.secondaryColor})` }}
                >
                  {(review.customer_name || t('عميل')).charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold flex items-center gap-1.5 truncate" style={{ color: themeColors.cardText }}>
                    {review.customer_name || t('عميل')}
                    <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: themeColors.inStockColor }} />
                  </p>
                  <p className="text-[11px] font-bold" style={{ color: themeColors.cardMutedText }}>
                    {localizedDate(review.created_at, lang, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
