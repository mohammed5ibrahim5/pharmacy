import { Home, Search, User, Heart, ArrowUp, MessageCircle, ShoppingCart } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useCustomer } from '@/context/CustomerContext';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';

export function MobileBottomNav() {
  const { settings, themeColors } = useSettings();
  const { navigate, route } = useRouter();
  const { user, setAuthModalOpen } = useCustomer();
  const { cartCount, openCart } = useOrder();
  const { t } = useLanguage();

  const whatsappDigits = settings.contact_whatsapp ? settings.contact_whatsapp.replace(/\D/g, '') : null;

  const items: { id: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }[] = [
    {
      id: 'home',
      label: t('الرئيسية'),
      icon: <Home className="w-5 h-5" />,
      active: route.name === 'home',
      onClick: () => navigate({ name: 'home' }),
    },
    {
      id: 'search',
      label: t('بحث'),
      icon: <Search className="w-5 h-5" />,
      active: route.name === 'search' || route.name === 'category',
      onClick: () => navigate({ name: 'search', query: '' }),
    },
    {
      id: 'favorites',
      label: t('المفضلة'),
      icon: <Heart className="w-5 h-5" />,
      active: false,
      onClick: () => {
        if (user) {
          navigate({ name: 'account', tab: 'favorites' });
        } else {
          setAuthModalOpen(true);
        }
      },
    },
    {
      id: 'cart',
      label: t('سلة التسوق'),
      icon: (
        <span className="relative">
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span
              className="absolute -top-2 -start-2.5 min-w-4 h-4 px-0.5 rounded-full text-[9px] font-black text-white flex items-center justify-center"
              style={{ backgroundColor: themeColors.priceColor }}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </span>
      ),
      active: false,
      onClick: () => openCart('cart'),
    },
    {
      id: 'account',
      label: t('حسابي'),
      icon: <User className="w-5 h-5" />,
      active: route.name === 'account',
      onClick: () => {
        if (user) {
          navigate({ name: 'account', tab: 'orders' });
        } else {
          setAuthModalOpen(true);
        }
      },
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
      <div className="backdrop-blur-xl border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pb-[env(safe-area-inset-bottom)]"
        style={{ backgroundColor: themeColors.bottomNavBg }}>
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl flex-1 min-w-0 transition-colors ${
                item.active ? 'text-white' : ''
              }`}
              style={item.active ? { backgroundColor: themeColors.bottomNavActiveText } : { color: themeColors.bottomNavText }}
            >
              {item.icon}
              <span className="text-[10px] font-extrabold">{item.label}</span>
            </button>
          ))}

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl flex-1 min-w-0 transition-colors"
            style={{ color: themeColors.bottomNavText }}
          >
            <ArrowUp className="w-5 h-5" />
            <span className="text-[10px] font-extrabold">{t('الأعلى')}</span>
          </button>
        </div>

        {whatsappDigits && (
          <div className="absolute -top-12 end-4">
            <a
              href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(t('مرحباً، أحتاج مساعدة من صيدليتي'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              style={{ backgroundColor: themeColors.whatsappBtnBg }}
              title={t('تواصل معنا واتساب')}
              aria-label={t('تواصل معنا واتساب')}
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
