import { Search, Store, ShoppingBag, Home } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const STEPS = [
  {
    icon: <Search className="w-6 h-6" />,
    title: 'ابحث عن دوائك',
    desc: 'ابحث بالاسم، امسح الباركود، استخدم البحث الصوتي، أو ارفع صورة الروشتة.',
  },
  {
    icon: <Store className="w-6 h-6" />,
    title: 'قارن الصيدليات',
    desc: 'راجع الأسعار والتقييمات واختر الصيدلية الأقرب إليك والأكثر ملاءمة.',
  },
  {
    icon: <ShoppingBag className="w-6 h-6" />,
    title: 'اطلب بأمان',
    desc: 'اختر الكمية والطريقة، وادفع إلكترونياً عبر فودافون كاش أو إينستاباي.',
  },
  {
    icon: <Home className="w-6 h-6" />,
    title: 'استلم في دقائق',
    desc: 'توصيل مباشر وسريع حتى باب منزلك بتغليف محكم وآمن على مدار الساعة.',
  },
];

export function HomeHowItWorks() {
  const { themeColors } = useSettings();

  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span
            className="text-xs font-extrabold px-3.5 py-1 rounded-full"
            style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
          >
            خطوات بسيطة وسريعة
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">كيف تعمل منصتنا؟</h2>
          <p className="text-sm text-slate-500 mt-2 font-bold">من البحث حتى الاستلام في 4 خطوات فقط</p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 right-[12%] left-[12%] h-0.5 rounded-full" style={{ background: `linear-gradient(to left, ${themeColors.primaryColor}30, ${themeColors.secondaryColor}30)` }} />

          {STEPS.map((step, i) => (
            <div key={i} className="relative text-center group">
              <div className="relative z-10 mx-auto mb-4">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center border-2 border-white shadow-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})`,
                    color: '#fff',
                    boxShadow: `0 16px 30px -10px ${themeColors.primaryColor}66`,
                  }}
                >
                  {step.icon}
                </div>
                <span
                  className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-md"
                  style={{ backgroundColor: themeColors.accentColor, color: '#fff' }}
                >
                  {i + 1}
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1.5">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium max-w-[240px] mx-auto">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
