import React from 'react';
import { Home, Heart, Store, FileText, User, ShoppingCart, Camera, MessageCircle } from 'lucide-react';
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

  const items = [
    {
      id: 'home',
      label: t('الرئيسية'),
      icon: Home,
      active: route.name === 'home',
      onClick: () => navigate({ name: 'home' }),
    },
    {
      id: 'health',
      label: t('صحة'),
      icon: Heart,
      active: route.name === 'health' || route.name === 'healthArticle',
      onClick: () => navigate({ name: 'health' }),
    },
    {
      id: 'pharmacies',
      label: t('الصيدليات'),
      icon: Store,
      active: route.name === 'search' || route.name === 'pharmacy',
      onClick: () => navigate({ name: 'search', query: '' }),
    },
    {
      id: 'orders',
      label: t('طلباتي'),
      icon: FileText,
      active: route.name === 'track' || (route.name === 'account' && route.tab === 'orders'),
      onClick: () => {
        if (user) {
          navigate({ name: 'account', tab: 'orders' });
        } else {
          navigate({ name: 'track' });
        }
      },
    },
    {
      id: 'profile',
      label: t('حسابي'),
      icon: User,
      active: route.name === 'account' && route.tab !== 'orders' && route.tab !== 'favorites',
      onClick: () => {
        if (user) {
          navigate({ name: 'account', tab: 'profile' });
        } else {
          setAuthModalOpen(true);
        }
      },
    },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      {/* Floating Action Buttons (FABs) matching Flutter APK */}
      <div className="flex flex-col items-end gap-2.5 px-4 pb-3 pointer-events-auto">
        {/* Cart FAB if items in cart */}
        {cartCount > 0 && (
          <button
            onClick={() => openCart('cart')}
            className="relative w-12 h-12 rounded-full text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all duration-300 active:scale-90 hover:scale-105"
            style={{ backgroundColor: themeColors.accentColor || '#f59e0b' }}
            title={t('سلة المشتريات')}
            aria-label={t('سلة المشتريات')}
          >
            <ShoppingCart className="w-5 h-5" />
            <span
              className="absolute -top-1.5 -start-1.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-md animate-bounce-in"
              style={{ backgroundColor: '#ef4444' }}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          </button>
        )}

        {/* Prescription Upload FAB (Camera) */}
        <button
          onClick={() => openCart('rx')}
          className="w-13 h-13 p-3.5 rounded-full text-white shadow-[0_10px_28px_rgba(16,185,129,0.35)] flex items-center justify-center transition-all duration-300 active:scale-90 hover:scale-105 group"
          style={{ backgroundColor: themeColors.primaryColor || '#10b981' }}
          title={t('رفع روشتة')}
          aria-label={t('رفع روشتة')}
        >
          <Camera className="w-6 h-6 transition-transform group-hover:rotate-12" />
        </button>

        {/* WhatsApp Button */}
        {whatsappDigits && (
          <a
            href={buildWhatsAppLink(whatsappDigits, t('مرحباً، أحتاج مساعدة من صيدليتي'))}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-full text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] flex items-center justify-center hover:scale-105 active:scale-90 transition-all"
            style={{ backgroundColor: themeColors.whatsappBtnBg || '#25D366' }}
            title={t('تواصل معنا واتساب')}
            aria-label={t('تواصل معنا واتساب')}
          >
            <MessageCircle className="w-5 h-5" />
          </a>
        )}
      </div>

      {/* Floating Frosted Navigation Bar */}
      <div className="px-3.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-auto">
        <div
          className="max-w-md mx-auto rounded-[28px] p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.14)] backdrop-blur-2xl border transition-all duration-300"
          style={{
            backgroundColor: `${themeColors.bottomNavBg || '#ffffff'}f2`,
            borderColor: 'rgba(255,255,255,0.4)',
          }}
        >
          <div className="flex items-center justify-between gap-1">
            {items.map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl flex-1 min-w-0 transition-all duration-300 active:scale-90 ${
                    item.active ? 'scale-105' : 'hover:bg-slate-500/5'
                  }`}
                  style={{
                    color: item.active
                      ? themeColors.primaryColor || '#10b981'
                      : themeColors.bottomNavText || '#64748b',
                  }}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                      item.active ? 'shadow-sm' : ''
                    }`}
                    style={
                      item.active
                        ? {
                            backgroundColor: `${themeColors.primaryColor || '#10b981'}18`,
                          }
                        : {}
                    }
                  >
                    <IconComponent
                      className={`w-5 h-5 transition-transform duration-300 ${
                        item.active ? 'scale-110' : ''
                      }`}
                      strokeWidth={item.active ? 2.5 : 2}
                    />
                  </div>

                  <span
                    className={`text-[10px] font-bold mt-0.5 tracking-tight transition-all duration-300 ${
                      item.active ? 'font-black opacity-100' : 'opacity-75'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Indicator Line underneath */}
                  <div
                    className={`h-1 rounded-full transition-all duration-300 mt-0.5 ${
                      item.active ? 'w-4 opacity-100' : 'w-0 opacity-0'
                    }`}
                    style={{ backgroundColor: themeColors.primaryColor || '#10b981' }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
