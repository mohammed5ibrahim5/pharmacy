import { useEffect } from 'react';
import { Clock, ArrowRight, CalendarDays, Flame, FileQuestion, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { getArticleBySlug, HEALTH_DISCLAIMER } from '@/lib/healthContent';
import { setPageSchema, removePageSchema, generateArticleSchema, generateFaqSchema } from '@/lib/seo';

export function HealthArticlePage({ slug }: { slug: string }) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const article = getArticleBySlug(slug);

  useEffect(() => {
    if (!article) return;
    setPageSchema('health-article-schema', generateArticleSchema({
      slug: article.slug,
      title: lang === 'en' ? article.title : article.title,
      excerpt: article.excerpt,
      category: article.category,
      keywords: article.keywords,
      updatedAt: article.updatedAt,
    }));
    setPageSchema('health-article-faq', generateFaqSchema(article.faq));
    document.title = `${article.title} | ${'صيدليتي'}`;
    return () => {
      removePageSchema('health-article-schema');
      removePageSchema('health-article-faq');
      document.title = 'صيدليتي - صيدلياتك القريبة منك';
    };
  }, [article, lang]);

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center" style={{ backgroundColor: themeColors.sectionAltBg || '#f8fafc' }}>
        <FileQuestion className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-lg font-black text-gray-800 mb-1">{t('الموضوع غير موجود')}</p>
        <p className="text-sm text-gray-500 mb-5">{t('ربما حُذف الموضوع أو الرابط غير صحيح.')}</p>
        <button
          onClick={() => navigate({ name: 'health' })}
          className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
          style={{ backgroundColor: themeColors.priceColor }}
        >
          {t('كل المواضيع الصحية')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeColors.sectionAltBg || '#f8fafc' }}>
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})` }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <button
            onClick={() => navigate({ name: 'health' })}
            className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-xs font-bold mb-4 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            {t('كل المواضيع الصحية')}
          </button>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black text-white mb-3">
            {t(article.category)}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug mb-3">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/85">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {new Date(article.updatedAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {t('قراءة {0} دقائق', [article.readingMins])}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Excerpt */}
        <div
          className="rounded-3xl p-5 mb-6 border"
          style={{ borderColor: `${themeColors.priceColor}25`, backgroundColor: `${themeColors.priceColor}08` }}
        >
          <p className="text-sm text-gray-700 leading-relaxed font-medium">{article.excerpt}</p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {article.sections.map((sec, i) => (
            <section key={i}>
              <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColors.priceColor }} />
                {sec.heading}
              </h2>
              {sec.paragraphs.map((p, j) => (
                <p key={j} className="text-[15px] text-gray-600 leading-loose mb-3">{p}</p>
              ))}
            </section>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-10 rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
            <FileQuestion className="w-5 h-5" style={{ color: themeColors.priceColor }} />
            {t('الأسئلة الشائعة')}
          </h2>
          <div className="space-y-4">
            {article.faq.map((f, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <p className="text-sm font-extrabold text-gray-800 mb-1.5">{f.q}</p>
                <p className="text-[13px] text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related hint */}
        <div
          className="mt-8 rounded-3xl p-6 text-center"
          style={{ background: `linear-gradient(135deg, ${themeColors.priceColor}12, ${themeColors.priceColor}05)`, borderColor: `${themeColors.priceColor}20` }}
        >
          <h3 className="text-base font-black text-gray-800 mb-1.5 flex items-center justify-center gap-2">
            <Flame className="w-5 h-5" style={{ color: themeColors.priceColor }} />
            {t('عندك دواء من هذه المجموعة؟')}
          </h3>
          <p className="text-xs text-gray-600 mb-4 max-w-md mx-auto">
            {t('ابحث عن أفضل سعر واطلبه من أقرب صيدلية لك الآن.')}
          </p>
          <button
            onClick={() => navigate({ name: 'search', query: article.searchHint })}
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl text-white font-bold text-sm shadow-lg"
            style={{ backgroundColor: themeColors.priceColor }}
          >
            {t('ابحث عن {0}', [lang === 'en' ? article.keywords[0] : article.searchHint])}
          </button>
        </div>

        <p className="mt-8 text-[11px] text-gray-400 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 inline -mt-0.5 me-1" />
          {t(HEALTH_DISCLAIMER)}
        </p>
      </div>
    </div>
  );
}