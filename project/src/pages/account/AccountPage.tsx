import { useState, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useFavorites } from '@/context/FavoritesContext';
import type { AccountTab } from '@/context/RouterContext';
import type { OrderRecord } from './types';
import { OrdersTab } from './OrdersTab';
import { PrescriptionsTab } from './PrescriptionsTab';
import { RewardsTab } from './RewardsTab';
import { RemindersTab } from './RemindersTab';
import { FamilyTab } from './FamilyTab';
import { AddressesTab } from './AddressesTab';
import { FavoritesTab } from './FavoritesTab';
import { SubscriptionsTab } from './SubscriptionsTab';
import { EditProfileModal } from './EditProfileModal';
import { OrderTrackingModal } from './OrderTrackingModal';
import { OrderReviewModal } from '@/components/OrderReviewModal';
import {
  ArrowLeft, PackageCheck, FileText, MapPin, Heart, User,
  Sparkles, LogOut, Pencil, ShieldCheck, Truck, Bell, Users,
  CheckCircle2, CalendarClock,
} from 'lucide-react';

export function AccountPage({ tab }: { tab: AccountTab }) {
  const { user, profile, setAuthModalOpen, signOut } = useCustomer();
  const { settings, themeColors, loyaltyConfig, featuresConfig, subscriptionConfig } = useSettings();
  const { navigate } = useRouter();
  const { t, lang } = useLanguage();
  const {
    favoriteProducts,
    favoritePharmacies,
    productFavoritesCount,
    pharmacyFavoritesCount,
  } = useFavorites();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<OrderRecord | null>(null);
  const [reviewOrder, setReviewOrder] = useState<OrderRecord | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 animate-fade-up">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden">
          <div
            className="absolute top-0 right-0 left-0 h-2"
            style={{ backgroundImage: `linear-gradient(to left, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}
          />
          <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg bg-teal-500/10 text-teal-600">
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">{t('مرحباً بك في صيدليتي')}</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
            {t('سجل دخولك الآن لتتمكن من متابعة طلباتك اليومية، وإدارة الروشتات، وملفك الطبي، ونقاط المكافآت المفضلة من مكان واحد بسهولة وأمان.')}
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-black shadow-lg hover:shadow-xl hover:brightness-105 active:scale-95 transition-all duration-300"
            style={{ backgroundColor: themeColors.primaryColor }}
          >
            {t('تسجيل الدخول / إنشاء حساب')}
          </button>
        </div>
      </div>
    );
  }

  const initial = (profile?.full_name || user.email || t('عميل')).charAt(0).toUpperCase();

  const tabs: { id: AccountTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'orders', label: t('طلباتي والشحنات'), icon: <PackageCheck className="w-4 h-4" />, count: 0 },
    ...(subscriptionConfig.enabled ? [{ id: 'subscriptions' as AccountTab, label: t('اشتراكاتي الشهرية'), icon: <CalendarClock className="w-4 h-4" />, count: 0 }] : []),
    { id: 'prescriptions', label: t('الروشتات المحفوظة'), icon: <FileText className="w-4 h-4" />, count: 0 },
    ...(loyaltyConfig.enabled ? [{ id: 'rewards' as AccountTab, label: t('نقاطي ومكافآتي'), icon: <Sparkles className="w-4 h-4" />, count: 0 }] : []),
    ...(featuresConfig.reminders ? [{ id: 'reminders' as AccountTab, label: t('ملفي الطبي والدوائي'), icon: <Bell className="w-4 h-4" />, count: 0 }] : []),
    ...(featuresConfig.familyMembers ? [{ id: 'family' as AccountTab, label: t('أفراد العائلة'), icon: <Users className="w-4 h-4" />, count: 0 }] : []),
    { id: 'addresses', label: t('العناوين المسجلة'), icon: <MapPin className="w-4 h-4" />, count: 0 },
    { id: 'favorites', label: t('مفضلتي'), icon: <Heart className="w-4 h-4" />, count: productFavoritesCount + pharmacyFavoritesCount },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-black px-6 py-3.5 rounded-full shadow-2xl animate-bounce-in flex items-center gap-2 border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          {toast}
        </div>
      )}

      <div
        className="relative rounded-[2.5rem] text-white overflow-hidden shadow-xl border border-white/10 mb-8"
        style={{ background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}
      >
        <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
        <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -end-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 end-1/4 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-3 p-5 sm:p-7 pb-2 sm:pb-3">
          <button onClick={() => navigate({ name: 'home' })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white/90 hover:text-white text-xs font-extrabold transition-all duration-300 active:scale-95">
            <ArrowLeft className="w-4 h-4" />
            {t('العودة للرئيسية')}
          </button>
          <button onClick={signOut} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-black transition-all duration-300 active:scale-95">
            <LogOut className="w-4 h-4" />
            {t('تسجيل الخروج')}
          </button>
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 px-5 sm:px-8 pb-6 sm:pb-8">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] object-cover border-[3px] border-white/20 shadow-xl ring-4 ring-white/10" />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl sm:text-4xl font-black border border-white/20 shadow-xl ring-4 ring-white/10 text-white">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile?.full_name || t('عميل صيدليتي')}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/20 backdrop-blur-md border border-emerald-300/30 text-[10px] font-black text-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('حساب موثق')}
              </span>
              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                title={t('تعديل البيانات الشخصية')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-[11px] font-black transition-all duration-300 active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t('تعديل')}
              </button>
            </div>
            <p className="text-xs text-white/75 font-bold mt-1.5" dir="ltr">{user.email}</p>
            {profile?.phone && <p className="text-xs text-white/75 font-bold mt-1" dir="ltr">{profile.phone}</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-4 shadow-sm hidden lg:block">
            <p className="text-[11px] font-black text-slate-400 px-3 pb-3 uppercase tracking-wider">{t('قائمة التحكم')}</p>
            <div className="space-y-1.5">
              {tabs.map((t) => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate({ name: 'account', tab: t.id }, { scrollToTop: false })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 group ${isActive ? 'text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    style={isActive ? { backgroundColor: themeColors.primaryColor, boxShadow: `0 8px 20px -6px ${themeColors.primaryColor}55` } : {}}
                  >
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                      {t.icon}
                    </span>
                    <span className="truncate flex-1 text-start">{t.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:hidden p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm mb-2 overflow-x-auto scrollbar-none flex items-center gap-1.5">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate({ name: 'account', tab: t.id }, { scrollToTop: false })}
                  className={`shrink-0 flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 ${isActive ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                  style={isActive ? { backgroundColor: themeColors.primaryColor, boxShadow: `0 6px 14px -4px ${themeColors.primaryColor}55` } : {}}
                >
                  {t.icon}
                  <span className="whitespace-nowrap">{t.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 min-w-0">
          {tab === 'orders' && <OrdersTab onTrackingOrder={setTrackingOrder} onReviewOrder={setReviewOrder} />}
          {tab === 'subscriptions' && <SubscriptionsTab />}
          {tab === 'prescriptions' && <PrescriptionsTab />}
          {tab === 'rewards' && <RewardsTab />}
          {tab === 'reminders' && <RemindersTab />}
          {tab === 'family' && <FamilyTab />}
          {tab === 'addresses' && <AddressesTab />}
          {tab === 'favorites' && <FavoritesTab />}
        </div>
      </div>

      {reviewOrder && (
        <OrderReviewModal
          orderId={reviewOrder.id}
          pharmacyId={reviewOrder.pharmacy_id}
          pharmacyName={reviewOrder.pharmacy?.name || ''}
          productName={reviewOrder.product?.name || ''}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => setReviewOrder(null)}
        />
      )}
      {trackingOrder && (
        <OrderTrackingModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}
      {editProfileOpen && (
        <EditProfileModal onClose={() => setEditProfileOpen(false)} />
      )}
    </div>
  );
}
