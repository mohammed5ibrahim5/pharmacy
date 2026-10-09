import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

const FAQS = [
  {
    q: 'كيف أطلب دواءً من الصيدليات؟',
    a: 'ابحث عن الدواء بالاسم أو امسح الباركود أو ارفع صورة الروشتة، ثم اختر الصيدلية المفضلة لديك وأكمل الطلب إلكترونياً مع الدفع عبر فودافون كاش أو إينستاباي.',
  },
  {
    q: 'هل التوصيل متاح على مدار الساعة؟',
    a: 'نعم، تتوفر خدمة التوصيل الطارئ 24 ساعة من الصيدليات المشاركة في قسم طوارئ 24/7، والتوصيل العادي متاح طوال ساعات عمل كل صيدلية.',
  },
  {
    q: 'هل يمكنني استخدام التأمين الصحي؟',
    a: 'الصيدليات المعتمدة توضح ما إذا كانت تقبل التأمين الصحي عبر شارة "قبول التأمين" على بطاقة الصيدلية، يمكنك أيضاً التأكد مباشرة عبر الاتصال بالصيدلية.',
  },
  {
    q: 'ماذا أفعل إذا لم يتوفر دوائي؟',
    a: 'استخدم زر "ارفع روشتتك" وسيساعدك فريقنا والصيدليات الشريكة في إيجاد الدواء وتوصيله إليك، أو تواصل معنا عبر واتساب في أي وقت.',
  },
  {
    q: 'هل أدويتي آمنة ومضمونة؟',
    a: 'جميع الصيدليات المشاركة مرخصة ومعتمدة، والأسعار محدثة يومياً، ويتم التوصيل بتغليف محكم وآمن مع إرفاق فاتورة الشراء.',
  },
];

export function HomeFAQ() {
  const { themeColors, storeConfig } = useSettings();
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const visibleFAQs = storeConfig.purchasesEnabled ? FAQS : FAQS.filter((f) => f.q !== 'هل التوصيل متاح على مدار الساعة؟');

  return (
    <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: themeColors.sectionBg }}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1 rounded-full"
            style={{ backgroundColor: `${themeColors.badgePillBg}15`, color: themeColors.badgePillText }}
          >
            <HelpCircle className="w-4 h-4" />
            {t('الأسئلة الشائعة')}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 leading-snug" style={{ color: themeColors.sectionHeadingText }}>
            {t('عندك سؤال؟')}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-l" style={{ backgroundImage: `linear-gradient(to left, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}>
              {t('إحنا جاهزين نجاوبك')}
            </span>
          </h2>
          <p className="text-sm mt-3 font-bold leading-relaxed" style={{ color: themeColors.sectionSubheadingText }}>
            {t('لو محتاج مساعدة في الطلب أو التوصيل أو طريقة الدفع، تصفح الأسئلة الشائعة أو تواصل معنا مباشرة.')}
          </p>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {visibleFAQs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="rounded-2xl border transition-all duration-300 overflow-hidden"
                style={{
                  backgroundColor: themeColors.cardBg,
                  borderColor: isOpen ? `${themeColors.primaryColor}40` : 'rgba(0,0,0,0.08)',
                  boxShadow: isOpen ? `0 12px 30px -12px ${themeColors.primaryColor}33` : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start"
                >
                  <span className="font-extrabold text-sm" style={{ color: themeColors.cardText }}>{t(faq.q)}</span>
                  <ChevronDown
                    className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: isOpen ? themeColors.primaryColor : themeColors.cardMutedText }}
                  />
                </button>
                <div
                  className="grid transition-all duration-300 ease-in-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-xs sm:text-sm leading-relaxed font-medium" style={{ color: themeColors.cardMutedText }}>
                      {t(faq.a)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
