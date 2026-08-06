import { Star, Quote, BadgeCheck } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const REVIEWS = [
  {
    name: 'أحمد محمود',
    role: 'عميل منذ 2024',
    initial: 'أ',
    color: '#0d9488',
    text: 'لقيت دواء بناتي في أقل من دقيقة، والبحث بالباركود وفّر عليّ مجهود كبير. التوصيل كان سريع جداً.',
  },
  {
    name: 'سارة عبدالله',
    role: 'صيدلية الزيتون',
    initial: 'س',
    color: '#2563eb',
    text: 'منصة سهلة ومريحة، قدرت أقارن الأسعار بين الصيدليات وأختار الأقرب. الروشتة اترفعت وردوا عليّ بسرعة.',
  },
  {
    name: 'محمد حسن',
    role: 'عميل منذ 2025',
    initial: 'م',
    color: '#d97706',
    text: 'أفضل حاجة إن في طوارئ 24 ساعة، ودواي وصلني نص الليل. التغليف محكم والأسعار مناسبة.',
  },
];

export function HomeTestimonials() {
  const { themeColors } = useSettings();

  return (
    <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: themeColors.sectionBg }}>
      <div className="text-center mb-10">
        <span
          className="text-xs font-extrabold px-3.5 py-1 rounded-full"
          style={{ backgroundColor: `${themeColors.badgePillBg}15`, color: themeColors.badgePillText }}
        >
          آراء عملائنا
        </span>
        <h2 className="text-2xl sm:text-3xl font-black mt-2" style={{ color: themeColors.sectionHeadingText }}>ماذا قالوا عنا؟</h2>
        <p className="text-sm mt-2 font-bold" style={{ color: themeColors.sectionSubheadingText }}>ثقة أكثر من 10 آلاف عميل هي سر تميزنا</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {REVIEWS.map((review, i) => (
          <div
            key={i}
            className="relative rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            style={{ backgroundColor: themeColors.cardBg }}
          >
            <Quote className="absolute top-5 left-5 w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: themeColors.primaryColor }} fill="currentColor" />

            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, s) => (
                <Star key={s} className="w-4 h-4 fill-current" style={{ color: themeColors.ratingColor }} />
              ))}
            </div>

            <p className="text-sm leading-relaxed font-medium mb-5" style={{ color: themeColors.cardMutedText }}>{review.text}</p>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0"
                style={{ background: `linear-gradient(135deg, ${review.color}, ${themeColors.secondaryColor})` }}
              >
                {review.initial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold flex items-center gap-1.5" style={{ color: themeColors.cardText }}>
                  {review.name}
                  <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: themeColors.inStockColor }} />
                </p>
                <p className="text-[11px] font-bold" style={{ color: themeColors.cardMutedText }}>{review.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
