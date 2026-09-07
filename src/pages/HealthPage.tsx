import { useEffect } from 'react';
import { Clock, ArrowLeft, Stethoscope, ShieldCheck, BookOpen, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { healthArticles, HEALTH_DISCLAIMER } from '@/lib/healthContent';
import { setPageSchema, removePageSchema, generateFaqSchema } from '@/lib/seo';

export function HealthPage() {
  const { t } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();

  useEffect(() => {
    setPageSchema(
      'health-faq-schema',
      generateFaqSchema([
        {
          q: 'ما هي الجرعة الآمنة من الباراسيتامول يومياً؟',
          a: 'للبالغين حتى 4 جرام (8 أقراص 500 مجم) موزعة على اليوم، وتُحسب جرعة الأطفال على الوزن. تجاوز ذلك أو الجمع بين مستحضرات تحتوي باراسيتامول خطر على الكبد.',
        },
        {
          q: 'عندي ضغط مرتفع، هل أتناول أدوية البرد التي تحتوي مزيل احتقان؟',
          a: 'يُفضل تجنبها لأنها قد ترفع الضغط، واللجوء لمستحضرات خالية من مضادات الاحتقان مع استشارة الطبيب أو الصيدلي.',
        },
      ])
    );
    return () => removePageSchema('health-faq-schema');
  }, []);

  const grouped = healthArticles.reduce<Record<string, typeof healthArticles>>((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ backgroundColor: themeColors.sectionAltBg || '#f8fafc' }}>
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor || themeColors.primaryColor})`,
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">{t('موسوعة صحتك ودوائك')}</h1>
          <p className="text-sm text-white/85 font-medium leading-relaxed max-w-2xl mx-auto">
            {t('معلومات توعوية موثوقة عن الأدوية الشائعة، جرعاتها، تداخلاتها، وكيفية استخدامها بأمان — من صيدلية صيدليتي.')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-100 text-[11px] font-bold text-gray-600 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
            {t('مصادر صيدلانية موثوقة')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-100 text-[11px] font-bold text-gray-600 shadow-sm">
            <BookOpen className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
            {t('دليل يومي سهل')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-100 text-[11px] font-bold text-gray-600 shadow-sm">
            <Clock className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
            {t('محتوى مُحدَّث باستمرار')}
          </span>
        </div>

        {Object.entries(grouped).map(([cat, articles]) => (
          <section key={cat} className="mb-10">
            <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-full" style={{ backgroundColor: themeColors.priceColor }} />
              {t(cat)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => navigate({ name: 'healthArticle', slug: a.slug })}
                  className="group text-start rounded-3xl bg-white border border-gray-100 shadow-sm p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
                      style={{ color: themeColors.priceColor, backgroundColor: `${themeColors.priceColor}10` }}
                    >
                      {t(a.category)}
                    </span>
                    <Clock className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <h3 className="font-extrabold text-sm leading-snug text-gray-900 group-hover:underline underline-offset-2">
                    {a.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-3 flex-1">{a.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black" style={{ color: themeColors.priceColor }}>
                    {t('اقرأ الموضوع')}
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <div className="rounded-3xl border bg-white shadow-sm p-6 text-center">
          <h3 className="text-base font-black text-gray-800 mb-1.5">{t('لسوء، عندك سؤال عن دواء في سلتك؟')}</h3>
          <p className="text-xs text-gray-500 mb-4">{t('تواصل معنا وسنجيبك بسرعة عبر واتساب.')}</p>
          <button
            onClick={() => navigate({ name: 'home' })}
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl text-white font-bold text-sm shadow-lg"
            style={{ backgroundColor: themeColors.priceColor }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('ابدأ التسوق الآن')}
          </button>
        </div>

        <p className="mt-8 text-[11px] text-gray-400 leading-relaxed text-center max-w-2xl mx-auto">{t(HEALTH_DISCLAIMER)}</p>
      </div>
    </div>
  );
}