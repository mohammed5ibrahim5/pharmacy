import { Home, Search, User, Heart, MessageCircle, ShoppingCart } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useCustomer } from '@/context/CustomerContext';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';

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
      active: route.name === 'account' && route.tab === 'favorites',
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
      label: t('السلة'),
      icon: (
        <span className="relative">
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span
              className="absolute -top-2 -start-2.5 min-w-4 h-4 px-0.5 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-bounce-in"
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
      active: route.name === 'account' && route.tab !== 'favorites',
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
      <div 
        className="glass border-t shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pb-[env(safe-area-inset-bottom)]"
        style={{ 
          backgroundColor: `${themeColors.bottomNavBg}F0`,
          borderColor: 'rgba(255,255,255,0.2)' 
        }}
      >
        <div className="flex items-center justify-between gap-1 max-w-lg mx-auto relative pt-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl flex-1 min-w-0 transition-all duration-300 active:scale-90 ${
                item.active ? 'text-white scale-105' : 'hover:bg-slate-500/5'
              }`}
              style={item.active ? { backgroundColor: themeColors.primaryColor } : { color: themeColors.bottomNavText }}
            >
              {item.active && (
                 <div className="absolute inset-0 rounded-2xl opacity-20 blur-sm" style={{ backgroundColor: themeColors.primaryColor }} />
              )}
              <div className={`transition-transform duration-300 ${item.active ? '-translate-y-0.5' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-extrabold transition-all duration-300 ${item.active ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {whatsappDigits && (
          <div className="absolute -top-14 end-4">
            <a
              href={buildWhatsAppLink(whatsappDigits, t('مرحباً، أحتاج مساعدة من صيدليتي'))}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full text-white shadow-[0_8px_20px_rgba(37,211,102,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-float"
              style={{ backgroundColor: themeColors.whatsappBtnBg }}
              title={t('تواصل معنا واتساب')}
              aria-label={t('تواصل معنا واتساب')}
            >
              <MessageCircle className="w-6 h-6" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
