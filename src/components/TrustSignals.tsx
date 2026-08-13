import { ShieldCheck, Award, Clock, Truck, BadgeCheck, Phone, Stethoscope, Lock } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

export function TrustSignals() {
  const { themeColors, homepageConfig, storeConfig } = useSettings();
  const { t } = useLanguage();

  const trust = homepageConfig.trust;
  if (!trust.showSection) return null;

  const cards = trust.cards;

  const signals = [
    {
      key: 'licensed',
      icon: <ShieldCheck className="w-6 h-6" />,
      title: 'صيدليات مرخّصة 100%',
      desc: 'جميع الصيدليات الشريكة معتمدة من هيئة الدواء',
      color: '#10b981',
      delay: '0s',
    },
    {
      key: 'secure',
      icon: <Lock className="w-6 h-6" />,
      title: 'بيانات آمنة ومشفّرة',
      desc: 'بياناتك محمية بتشفير SSL 256-bit',
      color: '#3b82f6',
      delay: '0.1s',
    },
    {
      key: 'pharmacists',
      icon: <Stethoscope className="w-6 h-6" />,
      title: 'صيادلة معتمدون',
      desc: 'فريق من الصيادلة المرخّصين يراجع كل طلب',
      color: '#8b5cf6',
      delay: '0.15s',
    },
    {
      key: 'fastDelivery',
      icon: <Clock className="w-6 h-6" />,
      title: 'توصيل أقل من 30 دقيقة',
      desc: 'خدمة التوصيل السريع متاحة على مدار الساعة',
      color: '#f59e0b',
      delay: '0.2s',
    },
    {
      key: 'authentic',
      icon: <BadgeCheck className="w-6 h-6" />,
      title: 'ضمان الأصالة 100%',
      desc: 'جميع المنتجات أصلية ومعتمدة من الجهات الرسمية',
      color: '#0d9488',
      delay: '0.25s',
    },
    {
      key: 'support',
      icon: <Phone className="w-6 h-6" />,
      title: 'دعم فوري 24/7',
      desc: 'فريق الدعم متاح دائماً للمساعدة في أي وقت',
      color: '#ec4899',
      delay: '0.3s',
    },
  ].filter((s) => cards[s.key as keyof typeof cards] && (s.key !== 'fastDelivery' || storeConfig.purchasesEnabled));

  return (
    <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold mb-3"
          style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
        >
          <Award className="w-3.5 h-3.5" />
          {t('لماذا تثق بنا؟')}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {t('ضماناتنا لك')}
        </h2>
        <p className="text-sm text-slate-500 mt-2 font-medium max-w-xl mx-auto leading-relaxed">
          {t('صحتك أمانة — نحرص على تقديم أعلى معايير الجودة والأمان في كل خطوة')}
        </p>
      </div>

      {/* Trust Grid — auto-adjusts columns to the number of visible cards */}
      {(() => {
        const count = signals.length;
        const gridClass =
          count <= 1
            ? 'grid-cols-1 max-w-sm mx-auto'
            : count === 2
            ? 'grid-cols-2 max-w-xl mx-auto'
            : count === 3
            ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl mx-auto'
            : count === 4
            ? 'grid-cols-2 lg:grid-cols-4 max-w-4xl mx-auto'
            : count === 5
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-w-5xl mx-auto'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';
        return (
        <div className={`grid ${gridClass} gap-4`}>
          {signals.map((signal, i) => (
            <div
              key={i}
              className="group flex flex-col items-center text-center p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-default animate-fade-up"
              style={{ animationDelay: signal.delay }}
            >
              <div
                className="w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: `${signal.color}15`,
                  color: signal.color,
                  border: `1px solid ${signal.color}30`,
                }}
              >
                {signal.icon}
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight mb-1">
                {t(signal.title)}
              </h3>
              <p className="text-[10px] text-slate-500 leading-snug font-medium">
                {t(signal.desc)}
              </p>
            </div>
          ))}
        </div>
        );
      })()}

      {/* Bottom trust bar — shows only when online purchases are enabled */}
      {trust.showBottomBar && storeConfig.purchasesEnabled && (
      <div
        className="mt-8 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 border"
        style={{
          backgroundColor: `${themeColors.primaryColor}08`,
          borderColor: `${themeColors.primaryColor}20`,
        }}
      >
        {[
          { icon: <Truck className="w-4 h-4" />, text: 'توصيل آمن ومضمون', color: themeColors.primaryColor },
          { icon: <ShieldCheck className="w-4 h-4" />, text: 'استرداد كامل إذا لم تكن راضياً', color: '#10b981' },
          { icon: <Award className="w-4 h-4" />, text: 'أكثر من 10,000 عميل سعيد', color: '#f59e0b' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${item.color}15`, color: item.color }}
            >
              {item.icon}
            </div>
            <span className="text-xs font-bold text-slate-700">{t(item.text)}</span>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
