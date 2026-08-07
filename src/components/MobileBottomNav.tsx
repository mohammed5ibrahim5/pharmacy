import { Home, Search, User, Heart, ArrowUp, MessageCircle, ShoppingCart } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useCustomer } from '@/context/CustomerContext';
import { useOrder } from '@/context/OrderContext';

export function MobileBottomNav() {
  const { settings, themeColors, storeConfig } = useSettings();
  const { navigate, route } = useRouter();
  const { user, setAuthModalOpen } = useCustomer();
  const { cartCount, openCart } = useOrder();

  const whatsappDigits = settings.contact_whatsapp ? settings.contact_whatsapp.replace(/\D/g, '') : null;

  const items: { id: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }[] = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: <Home className="w-5 h-5" />,
      active: route.name === 'home',
      onClick: () => navigate({ name: 'home' }),
    },
    {
      id: 'search',
      label: 'بحث',
      icon: <Search className="w-5 h-5" />,
      active: route.name === 'search' || route.name === 'category',
      onClick: () => navigate({ name: 'search', query: '' }),
    },
    {
      id: 'favorites',
      label: 'المفضلة',
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
    ...(storeConfig.purchasesEnabled
      ? [
          {
            id: 'cart',
            label: 'سلة التسوق',
            icon: (
              <span className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-2 -left-2.5 min-w-4 h-4 px-0.5 rounded-full text-[9px] font-black text-white flex items-center justify-center"
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
        ]
      : []),
    {
      id: 'account',
      label: 'حسابي',
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
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 rounded-xl min-w-[4rem] transition-colors ${
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
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-3 rounded-xl min-w-[4rem] transition-colors"
            style={{ color: themeColors.bottomNavText }}
          >
            <ArrowUp className="w-5 h-5" />
            <span className="text-[10px] font-extrabold">الأعلى</span>
          </button>
        </div>

        {whatsappDigits && (
          <div className="absolute -top-12 right-4">
            <a
              href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent('مرحباً، أحتاج مساعدة من صيدليتي')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              style={{ backgroundColor: themeColors.whatsappBtnBg }}
              title="تواصل معنا واتساب"
              aria-label="تواصل معنا واتساب"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
