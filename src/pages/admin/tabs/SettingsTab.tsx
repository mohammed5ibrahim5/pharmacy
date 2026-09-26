import { useState, useEffect } from 'react';
import {
  Settings, Cross, Megaphone, Sparkles, List, Wallet, LayoutDashboard, Phone, Globe,
  Truck, ShieldCheck, Shield, Users, Star, Zap, FileText, Store, Info, Save, Check,
  BadgePercent, BellRing, Bell, Baby, Scale, Coins,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  useSettings, DEFAULT_THEME_COLORS, DEFAULT_HEADER_CONFIG, DEFAULT_FOOTER_CONFIG,
  DEFAULT_HERO_CONFIG, DEFAULT_HOW_IT_WORKS_CONFIG, DEFAULT_PAYMENT_CONFIG,
  DEFAULT_STORE_CONFIG, DEFAULT_HOMEPAGE_CONFIG, DEFAULT_LOYALTY_CONFIG,
  DEFAULT_FEATURES_CONFIG, DEFAULT_COMMISSION_CONFIG,
  type ThemeColors, type LoyaltyConfig, type FeaturesConfig, type WelcomePopupConfig,
  type CommissionConfig,
} from '@/context/SettingsContext';
import { translateError } from '@/lib/errorMessages';
import { HERO_BADGE_ICON_MAP, heroBadgeIcon } from '@/lib/heroBadges';
import { ImageUploader } from '@/components/ImageUploader';
import { Field, SettingsSection, Toggle, FeatureToggle, ColorField, ImageUrlField, inputClass, withAlphaHex, useToast, ConfirmModal } from './shared';
import type { SiteSettings, FooterConfig, HeroConfig, HowItWorksConfig, HomepageConfig } from '@/types';

const settingsNav = [
  { id: 'identity', label: 'الهوية والواجهة', icon: <Cross className="w-4 h-4" /> },
  { id: 'header', label: 'الهيدر', icon: <Megaphone className="w-4 h-4" /> },
  { id: 'hero', label: 'القسم الرئيسي (Hero)', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'howItWorks', label: 'كيف تعمل المنصة', icon: <List className="w-4 h-4" /> },
  { id: 'payment', label: 'الدفع والشحن', icon: <Wallet className="w-4 h-4" /> },
  { id: 'content', label: 'المحتوى والأقسام', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'features', label: 'الميزات والولاء', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'commission', label: 'العمولة والاشتراكات', icon: <Coins className="w-4 h-4" /> },
  { id: 'contact', label: 'التواصل', icon: <Phone className="w-4 h-4" /> },
  { id: 'footer', label: 'التذييل (Footer)', icon: <Globe className="w-4 h-4" /> },
] as const;
type SettingsTabKey = (typeof settingsNav)[number]['id'];

export function SettingsTab() {
  const { settings, refresh, themeColors } = useSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<SettingsTabKey>('identity');
  const [resetConfirm, setResetConfirm] = useState<'hero' | 'footer' | null>(null);

  const showToast = (msg: string) => { toast(msg); };

  const [colors, setColors] = useState<ThemeColors>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.themeColors) return { ...DEFAULT_THEME_COLORS, ...parsed.themeColors };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_THEME_COLORS };
  });

  const [headerCfg, setHeaderCfg] = useState(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.headerConfig) return { ...DEFAULT_HEADER_CONFIG, ...parsed.headerConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_HEADER_CONFIG };
  });

  const [footerCfg, setFooterCfg] = useState<FooterConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.footerConfig) return { ...DEFAULT_FOOTER_CONFIG, ...parsed.footerConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_FOOTER_CONFIG };
  });

  const [paymentCfg, setPaymentCfg] = useState(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.paymentConfig) return { ...DEFAULT_PAYMENT_CONFIG, ...parsed.paymentConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_PAYMENT_CONFIG };
  });

  const [commissionCfg, setCommissionCfg] = useState<CommissionConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.commissionConfig) return { ...DEFAULT_COMMISSION_CONFIG, ...parsed.commissionConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_COMMISSION_CONFIG };
  });

  const [heroCfg, setHeroCfg] = useState<HeroConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.heroConfig) return { ...DEFAULT_HERO_CONFIG, ...parsed.heroConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_HERO_CONFIG };
  });

  const [howCfg, setHowCfg] = useState<HowItWorksConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.howItWorksConfig) return { ...DEFAULT_HOW_IT_WORKS_CONFIG, ...parsed.howItWorksConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_HOW_IT_WORKS_CONFIG };
  });

  const [loyaltyCfg, setLoyaltyCfg] = useState<LoyaltyConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.loyaltyConfig) return { ...DEFAULT_LOYALTY_CONFIG, ...parsed.loyaltyConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_LOYALTY_CONFIG };
  });

  const [featuresCfg, setFeaturesCfg] = useState<FeaturesConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.featuresConfig) return { ...DEFAULT_FEATURES_CONFIG, ...parsed.featuresConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_FEATURES_CONFIG };
  });

  const [homepageCfg, setHomepageCfg] = useState<HomepageConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.homepageConfig) return { ...DEFAULT_HOMEPAGE_CONFIG, ...parsed.homepageConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...DEFAULT_HOMEPAGE_CONFIG };
  });

  const { welcomeConfig: ctxWelcome } = useSettings();
  const [welcomeCfgLocal] = useState<WelcomePopupConfig>(() => {
    if (settings.features_json) {
      try {
        const parsed = JSON.parse(settings.features_json);
        if (parsed && parsed.welcomeConfig) return { ...ctxWelcome, ...parsed.welcomeConfig };
      } catch { /* corrupted settings — fall back to defaults */ }
    }
    return { ...ctxWelcome };
  });

  useEffect(() => {
    setColors(prev => ({
      ...prev,
      primaryColor: form.primary_color,
      secondaryColor: form.secondary_color,
      accentColor: form.accent_color,
    }));
  }, [form.primary_color, form.secondary_color, form.accent_color]);

  useEffect(() => {
    if (settings.id && form.id === '') setForm(settings);
  }, [settings, form.id]);

  const handleSave = async () => {
    if (!form.id) { showToast('تعذر الحفظ — لم يتم تحميل الإعدادات بعد، أعد المحاولة بعد قليل'); return; }
    setSaving(true);
    let existingStoreConfig = { ...DEFAULT_STORE_CONFIG };
    try {
      const p = settings.features_json ? JSON.parse(settings.features_json) : {};
      if (p && p.storeConfig) existingStoreConfig = { ...DEFAULT_STORE_CONFIG, ...p.storeConfig };
    } catch { /* corrupted settings — fall back to defaults */ }
    const updatedFeaturesJson = JSON.stringify({
      themeColors: colors, headerConfig: headerCfg, footerConfig: footerCfg,
      paymentConfig: paymentCfg, commissionConfig: commissionCfg, heroConfig: heroCfg, howItWorksConfig: howCfg,
      storeConfig: existingStoreConfig, homepageConfig: homepageCfg,
      loyaltyConfig: loyaltyCfg, featuresConfig: featuresCfg, welcomeConfig: welcomeCfgLocal,
    });
    const basePayload = {
      site_name: form.site_name, site_tagline: form.site_tagline, site_description: form.site_description,
      logo_url: form.logo_url, primary_color: colors.primaryColor, secondary_color: colors.secondaryColor,
      accent_color: colors.accentColor, contact_phone: form.contact_phone, contact_email: form.contact_email,
      contact_whatsapp: form.contact_whatsapp, contact_address: form.contact_address, footer_text: form.footer_text,
      hero_title: form.hero_title, hero_subtitle: form.hero_subtitle, facebook_url: form.facebook_url,
      instagram_url: form.instagram_url, twitter_url: form.twitter_url, about_title: form.about_title,
      about_text: form.about_text, announcement_text: form.announcement_text,
      announcement_active: form.announcement_active, features_json: updatedFeaturesJson,
      updated_at: new Date().toISOString(),
    };
    const englishPayload = {
      site_name_en: form.site_name_en || null, site_tagline_en: form.site_tagline_en || null,
      site_description_en: form.site_description_en || null, hero_title_en: form.hero_title_en || null,
      hero_subtitle_en: form.hero_subtitle_en || null, footer_text_en: form.footer_text_en || null,
      announcement_text_en: form.announcement_text_en || null, about_title_en: form.about_title_en || null,
      about_text_en: form.about_text_en || null, contact_address_en: form.contact_address_en || null,
    };
    const isMissingColumnError = (e: { code?: string; message?: string } | null) =>
      !!e && (e.code === '42703' || /column .* does not exist/i.test(e.message || ''));
    let saveError = (await supabase.from('site_settings').update({ ...basePayload, ...englishPayload }).eq('id', form.id)).error;
    if (isMissingColumnError(saveError)) {
      saveError = (await supabase.from('site_settings').update(basePayload).eq('id', form.id)).error;
      if (!saveError) showToast('تم الحفظ — لكن أعمدة الترجمة الإنجليزية غير منشأة بعد في قاعدة البيانات، شغّل ملف الترحيل settings_text_en.sql لتفعيلها');
    }
    setSaving(false);
    if (saveError) { showToast(translateError(saveError.message).ar || 'تعذر حفظ الإعدادات، حاول مرة أخرى'); return; }
    setSaved(true); refresh(); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" /><span className="text-sm font-medium">تم حفظ الإعدادات والألوان بنجاح</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gray-900 text-white flex items-center justify-center"><Settings className="w-3.5 h-3.5" /></span>
            <span className="text-xs font-black text-gray-800">إعدادات الموقع</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 hidden sm:block">اختر القسم الذي تريد تعديله</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none p-2">
          {settingsNav.map((item) => (
            <button key={item.id} onClick={() => setSettingsSubTab(item.id)} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${settingsSubTab === item.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
              <span className={settingsSubTab === item.id ? 'text-teal-300' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {settingsSubTab === 'identity' && (
        <div className="space-y-6">
          <SettingsSection title="هوية الموقع الأساسية" icon={<Cross className="w-5 h-5" />}>
            <Field label="اسم الموقع"><input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className={inputClass} /></Field>
            <Field label="اسم الموقع (English)"><input value={form.site_name_en || ''} onChange={(e) => setForm({ ...form, site_name_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Site name" /></Field>
            <Field label="الشعار النصي (Tagline)"><input value={form.site_tagline} onChange={(e) => setForm({ ...form, site_tagline: e.target.value })} className={inputClass} /></Field>
            <Field label="الشعار النصي (English)"><input value={form.site_tagline_en || ''} onChange={(e) => setForm({ ...form, site_tagline_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Tagline" /></Field>
            <Field label="وصف الموقع"><textarea value={form.site_description || ''} onChange={(e) => setForm({ ...form, site_description: e.target.value })} className={inputClass} rows={2} /></Field>
            <Field label="وصف الموقع (English)"><textarea value={form.site_description_en || ''} onChange={(e) => setForm({ ...form, site_description_en: e.target.value })} className={inputClass} rows={2} dir="ltr" placeholder="Site description" /></Field>
            <ImageUrlField label="شعار الموقع (Logo)" value={form.logo_url || ''} onChange={(v) => setForm({ ...form, logo_url: v })} />
          </SettingsSection>
          <SettingsSection title="القسم الرئيسي (Hero)" icon={<LayoutDashboard className="w-5 h-5" />}>
            <Field label="العنوان الرئيسي"><input value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} className={inputClass} /></Field>
            <Field label="العنوان الرئيسي (English)"><input value={form.hero_title_en || ''} onChange={(e) => setForm({ ...form, hero_title_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Hero title" /></Field>
            <Field label="النص الفرعي"><textarea value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} className={inputClass} rows={2} /></Field>
            <Field label="النص الفرعي (English)"><textarea value={form.hero_subtitle_en || ''} onChange={(e) => setForm({ ...form, hero_subtitle_en: e.target.value })} className={inputClass} rows={2} dir="ltr" placeholder="Hero subtitle" /></Field>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'header' && (
        <div className="space-y-6">
          <SettingsSection title="شريط الهيدر العلوي" icon={<Megaphone className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">التحكم في عناصر الشريط العلوي للهيدر ("خدمة 24/7" و"رفع روشتة طبية") — إظهار/إخفاء وتعديل النصوص.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <Toggle checked={headerCfg.showTopBar} onChange={(v) => setHeaderCfg({ ...headerCfg, showTopBar: v })} label="إظهار الشريط العلوي بالكامل" hint="عند إيقافه يختفي الشريط كله (رقم الهاتف + الروشتة)" />
              <Toggle checked={headerCfg.showContactPhone} onChange={(v) => setHeaderCfg({ ...headerCfg, showContactPhone: v })} label="إظهار رقم الهاتف في الشريط" hint="عرض/إخفاء رقم التواصل داخل الشريط العلوي" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800">عنصر "خدمة 24/7" (شريط الخدمة)</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={headerCfg.showServiceBar} onChange={(e) => setHeaderCfg({ ...headerCfg, showServiceBar: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-xs text-gray-600">ظاهر</span>
                  </label>
                </div>
                <Field label="نص شريط الخدمة"><input value={headerCfg.serviceText} onChange={(e) => setHeaderCfg({ ...headerCfg, serviceText: e.target.value })} className={inputClass} placeholder="مثال: خدمة 24/7 طوارئ ودعم صيدلي مباشر" /></Field>
                <Field label="نص شريط الخدمة (English)"><input value={headerCfg.serviceText_en || ''} onChange={(e) => setHeaderCfg({ ...headerCfg, serviceText_en: e.target.value })} className={inputClass} dir="ltr" placeholder="e.g. 24/7 emergency pharmacy support" /></Field>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-gray-800">عنصر "رفع روشتة طبية"</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={headerCfg.showPrescriptionBar} onChange={(e) => setHeaderCfg({ ...headerCfg, showPrescriptionBar: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-xs text-gray-600">ظاهر</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">إظهار/إخفاء زر "رفع روشتة طبية" في الشريط العلوي وزر الموبايل، وتغيير لونه بالكامل.</p>
                <Field label="لون زر رفع الروشتة"><input type="color" value={headerCfg.prescriptionBarColor} onChange={(e) => setHeaderCfg({ ...headerCfg, prescriptionBarColor: e.target.value })} className="w-full h-11 rounded-xl border border-gray-200 cursor-pointer p-1" /></Field>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">لون الشريط الكامل الذي يحتوي عناصر "خدمة 24/7" و"رفع روشتة طبية" وأرقام التواصل.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="لون خلفية الشريط"><input type="color" value={headerCfg.topBarColor} onChange={(e) => setHeaderCfg({ ...headerCfg, topBarColor: e.target.value })} className="w-full h-11 rounded-xl border border-gray-200 cursor-pointer p-1" /></Field>
                  <Field label="لون نصوص الشريط"><input type="color" value={headerCfg.topBarTextColor} onChange={(e) => setHeaderCfg({ ...headerCfg, topBarTextColor: e.target.value })} className="w-full h-11 rounded-xl border border-gray-200 cursor-pointer p-1" /></Field>
                </div>
              </div>
            </div>
          </SettingsSection>
          <SettingsSection title="ميزات الهيدر" icon={<Zap className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">تحكم في عناصر البحث وشريط الهيدر — مفاتيح جاهزة للإظهار والإخفاء.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle checked={headerCfg.showVoiceSearch} onChange={(v) => setHeaderCfg({ ...headerCfg, showVoiceSearch: v })} label="البحث الصوتي" hint="أيقونة الميكروفون بجانب حقل البحث" />
              <Toggle checked={headerCfg.showBarcode} onChange={(v) => setHeaderCfg({ ...headerCfg, showBarcode: v })} label="ماسح الباركود" hint="زر الباركود في حقل البحث" />
              <Toggle checked={headerCfg.showTrendingTags} onChange={(v) => setHeaderCfg({ ...headerCfg, showTrendingTags: v })} label="الكلمات الأكثر بحثاً" hint="شريط الأكثر طلباً أسفل الهيدر" />
              <Toggle checked={headerCfg.showWhatsAppButton} onChange={(v) => setHeaderCfg({ ...headerCfg, showWhatsAppButton: v })} label="زر واتساب المباشر" hint="زر التواصل عبر واتساب في الهيدر" />
              <Toggle checked={headerCfg.showCategoryPills} onChange={(v) => setHeaderCfg({ ...headerCfg, showCategoryPills: v })} label="شريط التصنيفات السريع" hint="أزرار التصنيفات الملونة أسفل الهيدر" />
            </div>
            {headerCfg.showTrendingTags && (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <label className="text-xs font-bold text-gray-800 block">طريقة شريط "الأكثر طلباً"</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => setHeaderCfg({ ...headerCfg, trendingMode: 'auto' })} className={`rounded-2xl border-2 p-4 text-start transition-all ${headerCfg.trendingMode === 'auto' ? 'shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`} style={headerCfg.trendingMode === 'auto' ? { borderColor: settings.primary_color, backgroundColor: `${settings.primary_color}0a` } : {}}>
                    <p className="text-sm font-extrabold text-gray-900">تلقائي (من الأكثر بحثاً فعلياً)</p>
                    <p className="text-[11px] text-gray-500 mt-1">يعرض تلقائياً الكلمات الأكثر بحثاً من العملاء، ويحدث بمرور الوقت.</p>
                  </button>
                  <button type="button" onClick={() => setHeaderCfg({ ...headerCfg, trendingMode: 'manual' })} className={`rounded-2xl border-2 p-4 text-start transition-all ${headerCfg.trendingMode === 'manual' ? 'shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`} style={headerCfg.trendingMode === 'manual' ? { borderColor: settings.primary_color, backgroundColor: `${settings.primary_color}0a` } : {}}>
                    <p className="text-sm font-extrabold text-gray-900">كلمات ثابتة (تحكم كامل)</p>
                    <p className="text-[11px] text-gray-500 mt-1">اكتب الكلمات التي تريدها كما هي، وعدّل أو أضف في أي وقت.</p>
                  </button>
                </div>
                {headerCfg.trendingMode === 'manual' ? (
                  <Field label="كلمات شريط الأكثر طلباً (افصل بينها بفاصلة)"><textarea value={headerCfg.trendingKeywords.join('، ')} onChange={(e) => setHeaderCfg({ ...headerCfg, trendingKeywords: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })} className={inputClass} rows={3} /></Field>
                ) : (
                  <Field label="الكلمات الاحتياطية (تظهر إن لم توجد بيانات بحث بعد)"><textarea value={headerCfg.trendingKeywords.join('، ')} onChange={(e) => setHeaderCfg({ ...headerCfg, trendingKeywords: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })} className={inputClass} rows={2} /></Field>
                )}
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {headerCfg.trendingMode === 'auto' ? 'في الوضع التلقائي تُسجّل كل كلمة يبحث عنها العملاء وتظهر الأكثر تكراراً (حتى 7 كلمات). إن لم توجد بيانات بعد، تظهر الكلمات الاحتياطية.' : `سيظهر في الشريط: ${headerCfg.trendingKeywords.length > 0 ? headerCfg.trendingKeywords.join('، ') : 'لا توجد كلمات بعد — أضفها من الأعلى.'}`}
                </p>
              </div>
            )}
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'hero' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.primary_color}15`, color: settings.primary_color }}><Sparkles className="w-4 h-4" /></span>
                  لوحة التحكم الكاملة في القسم الرئيسي (Hero)
                </h3>
                <p className="text-xs text-gray-500 mt-1.5">تحكم في نصوص وأزرار وأرقام القسم الأول للرئيسية — ثم احفظ من الأسفل.</p>
              </div>
              <button type="button" onClick={() => setResetConfirm('hero')} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all">إعادة تعيين الافتراضي</button>
            </div>
          </div>
          <SettingsSection title="أقسام الهيرو" icon={<LayoutDashboard className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">مفاتيح إظهار/إخفاء لكل عنصر في القسم الرئيسي.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle checked={heroCfg.showSearch} onChange={(v) => setHeroCfg({ ...heroCfg, showSearch: v })} label="صندوق البحث" hint="شريط البحث الرئيسي في الهيرو" />
              <Toggle checked={heroCfg.showTrending} onChange={(v) => setHeroCfg({ ...heroCfg, showTrending: v })} label="الكلمات الأكثر بحثاً" hint="الأكثر بحثاً أسفل صندوق البحث" />
              <Toggle checked={heroCfg.showPrescriptionButton} onChange={(v) => setHeroCfg({ ...heroCfg, showPrescriptionButton: v })} label="زر رفع الروشتة" hint="زر رفع الروشتة الطبية" />
              <Toggle checked={heroCfg.showLocationButton} onChange={(v) => setHeroCfg({ ...heroCfg, showLocationButton: v })} label="زر تحديد الموقع" hint="زر تحديد الموقع لإيجاد أقرب الصيدليات" />
            </div>
          </SettingsSection>
          <SettingsSection title="نصوص الهيرو" icon={<FileText className="w-5 h-5" />}>
            <div className="space-y-4">
              <Field label="نص البحث الافتراضي (Placeholder)"><input value={heroCfg.searchPlaceholder} onChange={(e) => setHeroCfg({ ...heroCfg, searchPlaceholder: e.target.value })} className={inputClass} /></Field>
              <Field label="نص البحث الافتراضي (English)"><input value={heroCfg.searchPlaceholder_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, searchPlaceholder_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Placeholder" /></Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="نص زر رفع الروشتة"><input value={heroCfg.prescriptionButtonText} onChange={(e) => setHeroCfg({ ...heroCfg, prescriptionButtonText: e.target.value })} className={inputClass} /></Field>
                <Field label="نص زر رفع الروشتة (English)"><input value={heroCfg.prescriptionButtonText_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, prescriptionButtonText_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Upload prescription" /></Field>
                <Field label="نص زر تحديد الموقع"><input value={heroCfg.locationButtonText} onChange={(e) => setHeroCfg({ ...heroCfg, locationButtonText: e.target.value })} className={inputClass} /></Field>
                <Field label="نص زر تحديد الموقع (English)"><input value={heroCfg.locationButtonText_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, locationButtonText_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Set location" /></Field>
              </div>
              <Field label="نص بعد تحديد الموقع"><input value={heroCfg.locationSetText} onChange={(e) => setHeroCfg({ ...heroCfg, locationSetText: e.target.value })} className={inputClass} /></Field>
              <Field label="نص بعد تحديد الموقع (English)"><input value={heroCfg.locationSetText_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, locationSetText_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Location set" /></Field>
              <Field label="عنوان قائمة الأكثر بحثاً"><input value={heroCfg.trendingLabel} onChange={(e) => setHeroCfg({ ...heroCfg, trendingLabel: e.target.value })} className={inputClass} /></Field>
              <Field label="عنوان قائمة الأكثر بحثاً (English)"><input value={heroCfg.trendingLabel_en || ''} onChange={(e) => setHeroCfg({ ...heroCfg, trendingLabel_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Trending now:" /></Field>
              <Field label="كلمات الأكثر بحثاً (افصل بينها بفاصلة)"><textarea value={heroCfg.trendingKeywords.join('، ')} onChange={(e) => setHeroCfg({ ...heroCfg, trendingKeywords: e.target.value.split(/[،,]/).map((s) => s.trim()).filter(Boolean) })} className={inputClass} rows={2} /></Field>
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'howItWorks' && (
        <div className="space-y-6">
          <SettingsSection title="قسم «كيف تعمل المنصة؟»" icon={<List className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">صندوق الخطوات الأربع (ابحث - قارن - اطلب - استلم) في الصفحة الرئيسية. فعّل المفتاح لإظهاره في الموقع أو أوقفه لإخفائه تماماً، وعدّل نصوصه من هنا.</p>
            <div className="space-y-3 mb-5">
              <Toggle checked={howCfg.enabled} onChange={(v) => setHowCfg({ ...howCfg, enabled: v })} label="إظهار القسم في الصفحة الرئيسية" hint="عند إيقافه يختفي صندوق الخطوات الأربع نهائياً من الموقع" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="النص العلوي (الشارة)"><input value={howCfg.badge} onChange={(e) => setHowCfg({ ...howCfg, badge: e.target.value })} className={inputClass} /></Field>
              <Field label="النص العلوي (English)"><input value={howCfg.badge_en || ''} onChange={(e) => setHowCfg({ ...howCfg, badge_en: e.target.value })} className={inputClass} dir="ltr" /></Field>
              <Field label="العنوان الرئيسي"><input value={howCfg.title} onChange={(e) => setHowCfg({ ...howCfg, title: e.target.value })} className={inputClass} /></Field>
              <Field label="العنوان الرئيسي (English)"><input value={howCfg.title_en || ''} onChange={(e) => setHowCfg({ ...howCfg, title_en: e.target.value })} className={inputClass} dir="ltr" /></Field>
              <Field label="العنوان الفرعي"><input value={howCfg.subtitle} onChange={(e) => setHowCfg({ ...howCfg, subtitle: e.target.value })} className={inputClass} /></Field>
              <Field label="العنوان الفرعي (English)"><input value={howCfg.subtitle_en || ''} onChange={(e) => setHowCfg({ ...howCfg, subtitle_en: e.target.value })} className={inputClass} dir="ltr" /></Field>
            </div>
          </SettingsSection>
          <SettingsSection title="نصوص الخطوات الأربع" icon={<List className="w-5 h-5" />}>
            <div className="space-y-4">
              {howCfg.steps.map((step, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-3 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: themeColors.primaryColor }}>{i + 1}</span>
                    الخطوة {i + 1}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input value={step.title} onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)) })} className={inputClass} placeholder="عنوان الخطوة" />
                    <input value={step.title_en || ''} onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, title_en: e.target.value } : s)) })} className={inputClass} dir="ltr" placeholder="Step title (EN)" />
                    <input value={step.desc} onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, desc: e.target.value } : s)) })} className={inputClass} placeholder="وصف الخطوة" />
                    <input value={step.desc_en || ''} onChange={(e) => setHowCfg({ ...howCfg, steps: howCfg.steps.map((s, j) => (j === i ? { ...s, desc_en: e.target.value } : s)) })} className={inputClass} dir="ltr" placeholder="Step description (EN)" />
                  </div>
                </div>
              ))}
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'payment' && (
        <div className="space-y-6">
          <SettingsSection title="طرق الدفع الإلكتروني" icon={<Wallet className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">أرقام الحسابات أو الروابط التي تظهر للعميل عند طلب منتج لإتمام التحويل.</p>
            <Field label="رقم فودافون كاش *"><input value={paymentCfg.vodafoneCash} onChange={(e) => setPaymentCfg({ ...paymentCfg, vodafoneCash: e.target.value })} className={inputClass} dir="ltr" placeholder="مثال: 01000000000" /></Field>
            <Field label="رقم / معرف انستا باي *"><input value={paymentCfg.instapay} onChange={(e) => setPaymentCfg({ ...paymentCfg, instapay: e.target.value })} className={inputClass} dir="ltr" placeholder="مثال: @username أو رقم الهاتف" /></Field>
          </SettingsSection>
          <SettingsSection title="التوصيل والشحن" icon={<Truck className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">قيم تُعرض للعميل عند الطلب لتوضيح رسوم التوصيل والدفع عند الاستلام.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رسوم التوصيل الافتراضية (ج.م)"><input value={paymentCfg.deliveryFee} onChange={(e) => setPaymentCfg({ ...paymentCfg, deliveryFee: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" placeholder="مثال: 25" /></Field>
              <Field label="التوصيل المجاني للطلبات فوق (ج.م)"><input value={paymentCfg.freeDeliveryThreshold} onChange={(e) => setPaymentCfg({ ...paymentCfg, freeDeliveryThreshold: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" placeholder="مثال: 300" /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رسوم الدفع عند الاستلام (ج.م)"><input value={paymentCfg.cashOnDeliveryFee} onChange={(e) => setPaymentCfg({ ...paymentCfg, cashOnDeliveryFee: e.target.value })} className={inputClass} dir="ltr" type="number" min="0" placeholder="مثال: 10" /></Field>
              <div className="flex items-end"><Toggle checked={paymentCfg.showCashOnDelivery} onChange={(v) => setPaymentCfg({ ...paymentCfg, showCashOnDelivery: v })} label="إظهار الدفع عند الاستلام" hint="خيار الدفع كاش عند الاستلام للعميل" /></div>
              <div className="flex items-end"><Toggle checked={paymentCfg.showOnlinePayment} onChange={(v) => setPaymentCfg({ ...paymentCfg, showOnlinePayment: v })} label="إظهار الدفع أونلاين (Paymob)" hint="بوابة الدفع الآمنة — يتطلب ضبط مفاتيح Paymob في إعدادات Vercel" /></div>
            </div>
            <Field label="ملاحظة التوصيل الظاهرة للعميل"><textarea value={paymentCfg.shippingNote} onChange={(e) => setPaymentCfg({ ...paymentCfg, shippingNote: e.target.value })} className={inputClass} rows={2} /></Field>
          </SettingsSection>
          <SettingsSection title="كيفية عمل النظام" icon={<ShieldCheck className="w-5 h-5" />}>
            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> العميل يختار الصيدلية التي يريد الطلب منها وطريقة الدفع، ثم يرفع صورة إثبات التحويل.</p>
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> تصل الطلبات الجديدة إلى تبويب "طلبات العملاء" في لوحة التحكم بحالة "قيد المراجعة".</p>
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> بعد التحقق من إثبات التحويل تقوم بتأكيد الطلب "تم تأكيد الدفع"، ثم "تم الشحن - في الطريق"، ثم "تم التسليم".</p>
              <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" /> يرى العميل تحديث الحالة فورياً في صفحة "طلباتي ومتابعة الشحنات" من حسابه.</p>
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'content' && (
        <div className="space-y-6">
          <SettingsSection title="قسم من نحن" icon={<Users className="w-5 h-5" />}>
            <Field label="عنوان القسم"><input value={form.about_title || ''} onChange={(e) => setForm({ ...form, about_title: e.target.value })} className={inputClass} /></Field>
            <Field label="عنوان القسم (English)"><input value={form.about_title_en || ''} onChange={(e) => setForm({ ...form, about_title_en: e.target.value })} className={inputClass} dir="ltr" placeholder="About title" /></Field>
            <Field label="نص القسم"><textarea value={form.about_text || ''} onChange={(e) => setForm({ ...form, about_text: e.target.value })} className={inputClass} rows={3} /></Field>
            <Field label="نص القسم (English)"><textarea value={form.about_text_en || ''} onChange={(e) => setForm({ ...form, about_text_en: e.target.value })} className={inputClass} rows={3} dir="ltr" placeholder="About text" /></Field>
          </SettingsSection>
          <SettingsSection title="قسم الصيدليات في الصفحة الرئيسية" icon={<Store className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">العنوان والنص الفرعي اللذان يظهران أعلى قسم الصيدليات في الصفحة الرئيسية للموقع.</p>
            <Field label="العنوان الرئيسي للقسم"><input value={homepageCfg.pharmaciesTitle} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesTitle: e.target.value })} className={inputClass} placeholder="مثال: الصيدليات المتاحة بجوارك" /></Field>
            <Field label="العنوان الرئيسي للقسم (English)"><input value={homepageCfg.pharmaciesTitle_en || ''} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesTitle_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Pharmacies near you" /></Field>
            <Field label="النص الفرعي للقسم"><input value={homepageCfg.pharmaciesSubtitle} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesSubtitle: e.target.value })} className={inputClass} placeholder="مثال: تصفح الصيدليات حسب تصنيف احتياجك" /></Field>
            <Field label="النص الفرعي للقسم (English)"><input value={homepageCfg.pharmaciesSubtitle_en || ''} onChange={(e) => setHomepageCfg({ ...homepageCfg, pharmaciesSubtitle_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Browse pharmacies by your needs" /></Field>
          </SettingsSection>
          <SettingsSection title="شريط الثقة (لماذا تثق بنا؟)" icon={<ShieldCheck className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">كروت الثقة التي تظهر في الصفحة الرئيسية. يمكنك إخفاء القسم بالكامل أو إظهار/إخفاء كل كارت على حدة.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureToggle icon={<ShieldCheck className="w-4 h-4" />} title="إظهار قسم كروت الثقة" desc="إظهار أو إخفاء القسم كاملاً في الصفحة الرئيسية" checked={homepageCfg.trust.showSection} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, showSection: v } })} color={settings.primary_color} />
              <FeatureToggle icon={<Star className="w-4 h-4" />} title="الشريط السفلي للثقة" desc="الشريط الصغير أسفل الكروت" checked={homepageCfg.trust.showBottomBar} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, showBottomBar: v } })} color={settings.primary_color} />
              <FeatureToggle icon={<Shield className="w-4 h-4" />} title="كارت: صيدليات مرخّصة 100%" desc="جميع الصيدليات الشريكة معتمدة من هيئة الدواء" checked={homepageCfg.trust.cards.licensed} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, licensed: v } } })} color={settings.primary_color} />
              <FeatureToggle icon={<ShieldCheck className="w-4 h-4" />} title="كارت: بيانات آمنة ومشفّرة" desc="بيانات العميل محمية بتشفير SSL" checked={homepageCfg.trust.cards.secure} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, secure: v } } })} color={settings.primary_color} />
              <FeatureToggle icon={<Users className="w-4 h-4" />} title="كارت: صيادلة معتمدون" desc="فريق من الصيادلة المرخّصين يراجع كل طلب" checked={homepageCfg.trust.cards.pharmacists} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, pharmacists: v } } })} color={settings.primary_color} />
              <FeatureToggle icon={<Truck className="w-4 h-4" />} title="كارت: توصيل أقل من 30 دقيقة" desc="خدمة التوصيل السريع متاحة على مدار الساعة" checked={homepageCfg.trust.cards.fastDelivery} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, fastDelivery: v } } })} color={settings.primary_color} />
              <FeatureToggle icon={<BadgePercent className="w-4 h-4" />} title="كارت: ضمان الأصالة 100%" desc="جميع المنتجات أصلية ومعتمدة من الجهات الرسمية" checked={homepageCfg.trust.cards.authentic} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, authentic: v } } })} color={settings.primary_color} />
              <FeatureToggle icon={<Phone className="w-4 h-4" />} title="كارت: دعم فوري 24/7" desc="فريق الدعم متاح دائماً للمساعدة في أي وقت" checked={homepageCfg.trust.cards.support} onChange={(v) => setHomepageCfg({ ...homepageCfg, trust: { ...homepageCfg.trust, cards: { ...homepageCfg.trust.cards, support: v } } })} color={settings.primary_color} />
            </div>
          </SettingsSection>
          <SettingsSection title="شارات الثقة في الهيرو (أعلى الصفحة الرئيسية)" icon={<Zap className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">الشارات الزجاجية التي تظهر أسفل محتوى قسم الهيرو في الصفحة الرئيسية.</p>
            <FeatureToggle icon={<Zap className="w-4 h-4" />} title="إظهار شارات الثقة في الهيرو" desc="إظهار أو إخفاء شريط الشارات كاملاً أسفل محتوى الهيرو" checked={homepageCfg.heroBadges.showBadges} onChange={(v) => setHomepageCfg({ ...homepageCfg, heroBadges: { ...homepageCfg.heroBadges, showBadges: v } })} color={settings.primary_color} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {homepageCfg.heroBadges.badges.map((badge) => {
                const updateBadge = (patch: Partial<typeof badge>) => setHomepageCfg({ ...homepageCfg, heroBadges: { ...homepageCfg.heroBadges, badges: homepageCfg.heroBadges.badges.map((b) => (b.id === badge.id ? { ...b, ...patch } : b)) } });
                const BadgeIcon = heroBadgeIcon(badge.icon);
                return (
                  <div key={badge.id} className={`p-4 rounded-2xl border-2 space-y-3 transition-colors ${badge.enabled ? 'border-teal-200 bg-teal-50/30' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}30` }}><BadgeIcon className="w-5 h-5" /></div>
                        <p className="text-sm font-bold text-gray-900 truncate">{badge.title || 'شارة'}</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <span className="text-[11px] font-bold text-gray-600">{badge.enabled ? 'ظاهرة' : 'مخفية'}</span>
                        <input type="checkbox" checked={badge.enabled} onChange={(e) => updateBadge({ enabled: e.target.checked })} className="w-4 h-4 accent-teal-500" />
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      <Field label="العنوان الرئيسي"><input value={badge.title} onChange={(e) => updateBadge({ title: e.target.value })} className={inputClass} placeholder="مثال: توصيل فوري" /></Field>
                      <Field label="العنوان الرئيسي (English)"><input value={badge.title_en || ''} onChange={(e) => updateBadge({ title_en: e.target.value })} className={inputClass} dir="ltr" placeholder="e.g. Fast delivery" /></Field>
                      <Field label="النص الفرعي"><input value={badge.subtitle} onChange={(e) => updateBadge({ subtitle: e.target.value })} className={inputClass} placeholder="مثال: أقل من 30 دقيقة" /></Field>
                      <Field label="النص الفرعي (English)"><input value={badge.subtitle_en || ''} onChange={(e) => updateBadge({ subtitle_en: e.target.value })} className={inputClass} dir="ltr" placeholder="e.g. Under 30 minutes" /></Field>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Field label="الأيقونة">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${badge.color}18`, color: badge.color }}><BadgeIcon className="w-5 h-5" /></div>
                            <select value={badge.icon} onChange={(e) => updateBadge({ icon: e.target.value })} className={inputClass}>
                              {Object.keys(HERO_BADGE_ICON_MAP).map((key) => (<option key={key} value={key}>{key}</option>))}
                            </select>
                          </div>
                        </Field>
                        <ColorField label="لون الأيقونة" value={badge.color} onChange={(v) => updateBadge({ color: v })} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingsSection>
          <SettingsSection title="الشريط الإعلاني" icon={<Megaphone className="w-5 h-5" />}>
            <label className="flex items-center gap-2 cursor-pointer mb-3"><input type="checkbox" checked={form.announcement_active} onChange={(e) => setForm({ ...form, announcement_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تفعيل الشريط الإعلاني</span></label>
            <Field label="نص الإعلان"><input value={form.announcement_text || ''} onChange={(e) => setForm({ ...form, announcement_text: e.target.value })} className={inputClass} placeholder="نص الإعلان الذي يظهر أعلى الموقع" /></Field>
            <Field label="نص الإعلان (English)"><input value={form.announcement_text_en || ''} onChange={(e) => setForm({ ...form, announcement_text_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Announcement text" /></Field>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'features' && (
        <div className="space-y-6">
          <SettingsSection title="تفعيل الميزات الرئيسية" icon={<Sparkles className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4">تحكم في إظهار أو إخفاء كل ميزة من الميزات الجديدة على واجهة الموقع.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureToggle icon={<Truck className="w-4 h-4" />} title="تتبع حالة الطلب" desc="شريط تقدم بصري لحالة الطلب + إشعار للعميل عند كل تحديث" checked={featuresCfg.orderTracking} onChange={(v) => setFeaturesCfg((p) => ({ ...p, orderTracking: v }))} color={settings.primary_color} />
              <FeatureToggle icon={<BellRing className="w-4 h-4" />} title="تنبيه توفر الدواء" desc="زر نبهني عند التوفر على المنتجات غير المتاحة + إشعار تلقائي عند التوفير" checked={featuresCfg.stockAlerts} onChange={(v) => setFeaturesCfg((p) => ({ ...p, stockAlerts: v }))} color={settings.primary_color} />
              <FeatureToggle icon={<Bell className="w-4 h-4" />} title="تذكير مواعيد الأدوية" desc="تبويب تذكير الأدوية في حساب العميل + إشعارات في المواعيد المحددة" checked={featuresCfg.reminders} onChange={(v) => setFeaturesCfg((p) => ({ ...p, reminders: v }))} color={settings.primary_color} />
              <FeatureToggle icon={<Users className="w-4 h-4" />} title="الطلب للعيلة" desc="العميل يضيف أفراد عائلته ويحدد كل طلب لمين" checked={featuresCfg.familyMembers} onChange={(v) => setFeaturesCfg((p) => ({ ...p, familyMembers: v }))} color={settings.primary_color} />
              <FeatureToggle icon={<Baby className="w-4 h-4" />} title="حاسبة جرعات الأطفال" desc="أداة تحسب جرعة آمنة من دواء معين حسب عمر ووزن الطفل" checked={featuresCfg.doseCalculator} onChange={(v) => setFeaturesCfg((p) => ({ ...p, doseCalculator: v }))} color={settings.primary_color} />
              <FeatureToggle icon={<Scale className="w-4 h-4" />} title="مقارنة أسعار الدواء" desc="زر على كل منتج يعرض نفس الدواء في الصيدليات الأخرى + بدائل بنفس المادة الفعالة" checked={featuresCfg.priceCompare} onChange={(v) => setFeaturesCfg((p) => ({ ...p, priceCompare: v }))} color={settings.primary_color} />
              <FeatureToggle icon={<Scale className="w-4 h-4" />} title="مقارنة الصيدليات" desc="إضافة الصيدليات لشريط مقارنة أسفل الشاشة وعرضها جنباً لجنب بجدول مفصل" checked={featuresCfg.pharmacyCompare} onChange={(v) => setFeaturesCfg((p) => ({ ...p, pharmacyCompare: v }))} color={settings.primary_color} />
            </div>
          </SettingsSection>
          <SettingsSection title="نظام نقاط الولاء" icon={<Sparkles className="w-5 h-5" />}>
            <label className="flex items-center gap-2 cursor-pointer mb-5"><input type="checkbox" checked={loyaltyCfg.enabled} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تفعيل نظام نقاط الولاء</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={`نقاط لكل طلب (حالياً ${loyaltyCfg.pointsPerOrder})`}><input type="number" min="0" value={loyaltyCfg.pointsPerOrder} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, pointsPerOrder: Math.max(0, parseInt(e.target.value) || 0) }))} className={inputClass} dir="ltr" /></Field>
              <Field label={`نقطة لكل (ج.م) — حالياً ${loyaltyCfg.pointsPerPound}`}><input type="number" min="1" value={loyaltyCfg.pointsPerPound} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, pointsPerPound: Math.max(1, parseInt(e.target.value) || 1) }))} className={inputClass} dir="ltr" /></Field>
              <Field label={`نقاط الاستبدال — حالياً ${loyaltyCfg.redeemThreshold}`}><input type="number" min="1" value={loyaltyCfg.redeemThreshold} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, redeemThreshold: Math.max(1, parseInt(e.target.value) || 1) }))} className={inputClass} dir="ltr" /></Field>
              <Field label={`قيمة الخصم عند الاستبدال (ج.م) — حالياً ${loyaltyCfg.redeemValue}`}><input type="number" min="0" value={loyaltyCfg.redeemValue} onChange={(e) => setLoyaltyCfg((p) => ({ ...p, redeemValue: Math.max(0, parseInt(e.target.value) || 0) }))} className={inputClass} dir="ltr" /></Field>
            </div>
            <p className="text-xs text-gray-400 mt-4">مثال: {loyaltyCfg.redeemThreshold} نقطة = خصم {loyaltyCfg.redeemValue} ج.م عند الطلب.</p>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'commission' && (
        <div className="space-y-6">
          <SettingsSection title="إعدادات العمولة" icon={<Coins className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">نسبة العمولة التي تأخدها المنصة من كل طلب. يتم حسابها تلقائياً عند إنشاء الطلب.</p>
            <label className="flex items-center gap-2 cursor-pointer mb-5"><input type="checkbox" checked={commissionCfg.enabled} onChange={(e) => setCommissionCfg({ ...commissionCfg, enabled: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-gray-700">تفعيل نظام العمولة</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="نسبة العمولة (%)"><input type="number" min="0" max="100" step="0.5" value={commissionCfg.percentage} onChange={(e) => setCommissionCfg({ ...commissionCfg, percentage: e.target.value })} className={inputClass} dir="ltr" placeholder="مثال: 5" /></Field>
              <Field label="حد أدنى للعمولة (ج.م)"><input type="number" min="0" step="0.5" value={commissionCfg.minCommission} onChange={(e) => setCommissionCfg({ ...commissionCfg, minCommission: e.target.value })} className={inputClass} dir="ltr" placeholder="مثال: 2" /></Field>
              <Field label="حد أعلى للعمولة (ج.م)"><input type="number" min="0" step="0.5" value={commissionCfg.maxCommission} onChange={(e) => setCommissionCfg({ ...commissionCfg, maxCommission: e.target.value })} className={inputClass} dir="ltr" placeholder="مثال: 50" /></Field>
            </div>
            <p className="text-xs text-gray-400 mt-2">مثال: طلب بقيمة 200 ج.م × {commissionCfg.percentage}% = {Number(commissionCfg.percentage) * 2} ج.م عمولة (بحد أدنى {commissionCfg.minCommission} ج.م وأعلى {commissionCfg.maxCommission} ج.م)</p>
          </SettingsSection>

          <SettingsSection title="خطط الاشتراك للصيدليات" icon={<BadgePercent className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">الشهر الأول مجاني (عمولة بس). بعد كده الصيدلية بتختار خطة اشتراك شهري.</p>
            <div className="space-y-3">
              {commissionCfg.subscriptionPlans.map((plan, idx) => (
                <div key={plan.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        value={plan.name}
                        onChange={(e) => {
                          const newPlans = [...commissionCfg.subscriptionPlans];
                          newPlans[idx] = { ...plan, name: e.target.value };
                          setCommissionCfg({ ...commissionCfg, subscriptionPlans: newPlans });
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                        placeholder="اسم الخطة"
                      />
                      <input
                        type="number"
                        min="0"
                        value={plan.price}
                        onChange={(e) => {
                          const newPlans = [...commissionCfg.subscriptionPlans];
                          newPlans[idx] = { ...plan, price: Number(e.target.value) || 0 };
                          setCommissionCfg({ ...commissionCfg, subscriptionPlans: newPlans });
                        }}
                        className="w-28 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                        dir="ltr"
                      />
                      <span className="text-xs text-gray-400 font-bold">ج.م/شهر</span>
                    </div>
                    <input
                      value={plan.description}
                      onChange={(e) => {
                        const newPlans = [...commissionCfg.subscriptionPlans];
                        newPlans[idx] = { ...plan, description: e.target.value };
                        setCommissionCfg({ ...commissionCfg, subscriptionPlans: newPlans });
                      }}
                      className="w-full mt-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-500"
                      placeholder="وصف الخطة"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 leading-relaxed">
              <Info className="w-4 h-4 inline-block align-middle ms-1" />
              الصيدليات الجدية بتاخد أول شهر مجاني. بعد كده بت挑 خطة اشتراك + العمولة بتفضل 5% على كل طلب.
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'contact' && (
        <div className="space-y-6">
          <SettingsSection title="معلومات التواصل" icon={<Phone className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رقم الهاتف"><input value={form.contact_phone || ''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} dir="ltr" /></Field>
              <Field label="واتساب"><input value={form.contact_whatsapp || ''} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} className={inputClass} dir="ltr" /></Field>
            </div>
            <Field label="البريد الإلكتروني"><input value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputClass} dir="ltr" /></Field>
            <Field label="العنوان"><input value={form.contact_address || ''} onChange={(e) => setForm({ ...form, contact_address: e.target.value })} className={inputClass} /></Field>
            <Field label="العنوان (English)"><input value={form.contact_address_en || ''} onChange={(e) => setForm({ ...form, contact_address_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Address" /></Field>
          </SettingsSection>
          <SettingsSection title="روابط التواصل الاجتماعي" icon={<Globe className="w-5 h-5" />}>
            <div className="space-y-3">
              <Field label="فيسبوك"><input value={form.facebook_url || ''} onChange={(e) => setForm({ ...form, facebook_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://facebook.com/..." /></Field>
              <Field label="انستجرام"><input value={form.instagram_url || ''} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://instagram.com/..." /></Field>
              <Field label="تويتر / X"><input value={form.twitter_url || ''} onChange={(e) => setForm({ ...form, twitter_url: e.target.value })} className={inputClass} dir="ltr" placeholder="https://x.com/..." /></Field>
            </div>
          </SettingsSection>
        </div>
      )}

      {settingsSubTab === 'footer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center"><Globe className="w-4 h-4" /></span>
                  لوحة التحكم الكاملة في التذييل
                </h3>
                <p className="text-xs text-gray-500 mt-1.5">تحكم في أقسام التذييل ونصوصه بالكامل — إظهار/إخفاء وتعديل المحتوى ثم احفظ من الأسفل.</p>
              </div>
              <button type="button" onClick={() => setResetConfirm('footer')} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all">إعادة تعيين الافتراضي</button>
            </div>
          </div>
          <SettingsSection title="أقسام التذييل" icon={<LayoutDashboard className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">اختر الأقسام التي تظهر في تذييل الموقع.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle checked={footerCfg.showNewsletter} onChange={(v) => setFooterCfg({ ...footerCfg, showNewsletter: v })} label="صندوق النشرة البريدية" hint="شريط الاشتراك في النشرة أعلى التذييل" />
              <Toggle checked={footerCfg.showQuickLinks} onChange={(v) => setFooterCfg({ ...footerCfg, showQuickLinks: v })} label="قسم الروابط السريعة" hint="روابط المنصة الرئيسية" />
              <Toggle checked={footerCfg.showContactSection} onChange={(v) => setFooterCfg({ ...footerCfg, showContactSection: v })} label="قسم التواصل والمساعدة" hint="الهاتف، الواتساب، البريد والعنوان" />
              <Toggle checked={footerCfg.showSocialSection} onChange={(v) => setFooterCfg({ ...footerCfg, showSocialSection: v })} label="قسم وسائل التواصل الاجتماعي" hint="أيقونات فيسبوك وانستجرام وتويتر" />
              <Toggle checked={footerCfg.showTrustBadges} onChange={(v) => setFooterCfg({ ...footerCfg, showTrustBadges: v })} label="شارات الثقة" hint="طبي موثوق، توصيل 24 ساعة، خدمة على مدار اليوم" />
              <Toggle checked={footerCfg.showBottomNotice} onChange={(v) => setFooterCfg({ ...footerCfg, showBottomNotice: v })} label="التنبيه الطبي السفلي" hint="نص: الأدوية تُصرف بناءً على التشخيص الطبي" />
              <Toggle checked={footerCfg.showCopyright} onChange={(v) => setFooterCfg({ ...footerCfg, showCopyright: v })} label="سطر الحقوق أسفل التذييل" hint="اسم الموقع والسنة وحقوق النشر" />
            </div>
          </SettingsSection>
          <SettingsSection title="نصوص التذييل" icon={<FileText className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="نص حقوق النشر (الأسفل)"><input value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className={inputClass} /></Field>
              <Field label="نص حقوق النشر (English)"><input value={form.footer_text_en || ''} onChange={(e) => setForm({ ...form, footer_text_en: e.target.value })} className={inputClass} dir="ltr" /></Field>
              <Field label="الجملة التعريفية تحت اسم الموقع"><input value={footerCfg.footerTagline} onChange={(e) => setFooterCfg({ ...footerCfg, footerTagline: e.target.value })} className={inputClass} placeholder="مثال: صيدليتك الأقرب أينما كنت" /></Field>
              <Field label="الجملة التعريفية (English)"><input value={footerCfg.footerTagline_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, footerTagline_en: e.target.value })} className={inputClass} dir="ltr" placeholder="Pharmacy tagline" /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="عنوان صندوق النشرة"><input value={footerCfg.newsletterTitle} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterTitle: e.target.value })} className={inputClass} disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="عنوان صندوق النشرة (English)"><input value={footerCfg.newsletterTitle_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterTitle_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="النص الفرعي للنشرة"><input value={footerCfg.newsletterSubtitle} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSubtitle: e.target.value })} className={inputClass} disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="النص الفرعي للنشرة (English)"><input value={footerCfg.newsletterSubtitle_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSubtitle_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="نص زر الاشتراك"><input value={footerCfg.newsletterButtonText} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterButtonText: e.target.value })} className={inputClass} disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="نص زر الاشتراك (English)"><input value={footerCfg.newsletterButtonText_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterButtonText_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="نص قسم التواصل الاجتماعي"><input value={footerCfg.socialText} onChange={(e) => setFooterCfg({ ...footerCfg, socialText: e.target.value })} className={inputClass} disabled={!footerCfg.showSocialSection} /></Field>
              <Field label="نص قسم التواصل الاجتماعي (English)"><input value={footerCfg.socialText_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, socialText_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showSocialSection} /></Field>
              <Field label="عنوان الروابط السريعة"><input value={footerCfg.quickLinksTitle} onChange={(e) => setFooterCfg({ ...footerCfg, quickLinksTitle: e.target.value })} className={inputClass} disabled={!footerCfg.showQuickLinks} /></Field>
              <Field label="عنوان الروابط السريعة (English)"><input value={footerCfg.quickLinksTitle_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, quickLinksTitle_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showQuickLinks} /></Field>
              <Field label="عنوان قسم التواصل والمساعدة"><input value={footerCfg.contactTitle} onChange={(e) => setFooterCfg({ ...footerCfg, contactTitle: e.target.value })} className={inputClass} disabled={!footerCfg.showContactSection} /></Field>
              <Field label="عنوان قسم التواصل والمساعدة (English)"><input value={footerCfg.contactTitle_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, contactTitle_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showContactSection} /></Field>
              <Field label="عنوان قسم وسائل التواصل"><input value={footerCfg.socialTitle} onChange={(e) => setFooterCfg({ ...footerCfg, socialTitle: e.target.value })} className={inputClass} disabled={!footerCfg.showSocialSection} /></Field>
              <Field label="عنوان قسم وسائل التواصل (English)"><input value={footerCfg.socialTitle_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, socialTitle_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showSocialSection} /></Field>
              <Field label="التنبيه الطبي السفلي"><input value={footerCfg.bottomNoticeText} onChange={(e) => setFooterCfg({ ...footerCfg, bottomNoticeText: e.target.value })} className={inputClass} disabled={!footerCfg.showBottomNotice} /></Field>
              <Field label="التنبيه الطبي السفلي (English)"><input value={footerCfg.bottomNoticeText_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, bottomNoticeText_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showBottomNotice} /></Field>
            </div>
          </SettingsSection>
          <SettingsSection title="تخصيص صندوق النشرة" icon={<Sparkles className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">عدّل ألوان صندوق الاشتراك بالنشرة وأضف صورة خلفية له.</p>
            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              <p className="text-xs font-bold text-gray-600 mb-3">معاينة حية</p>
              <div className="rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${footerCfg.newsletterBgStart}, ${footerCfg.newsletterBgEnd})` }}>
                {footerCfg.newsletterBgImage && <img src={footerCfg.newsletterBgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none" />}
                <div className="relative flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border backdrop-blur-sm" style={{ backgroundColor: withAlphaHex(footerCfg.newsletterTextColor, 0.15), borderColor: withAlphaHex(footerCfg.newsletterTextColor, 0.8) }}><Sparkles className="w-4 h-4" style={{ color: footerCfg.newsletterTextColor }} /></div>
                  <div>
                    <p className="text-sm font-black" style={{ color: footerCfg.newsletterTextColor }}>{footerCfg.newsletterTitle}</p>
                    <p className="text-[10px] font-medium" style={{ color: withAlphaHex(footerCfg.newsletterTextColor, 0.8) }}>{footerCfg.newsletterSubtitle}</p>
                  </div>
                </div>
                <div className="relative flex items-center gap-2">
                  <span className="px-3 py-2 rounded-xl text-[10px] font-bold" style={{ backgroundColor: withAlphaHex(footerCfg.newsletterTextColor, 0.15), border: `1px solid ${withAlphaHex(footerCfg.newsletterTextColor, 0.8)}`, color: footerCfg.newsletterTextColor }}>{footerCfg.newsletterInputPlaceholder}</span>
                  <span className="px-3 py-2 rounded-xl text-[10px] font-extrabold shadow-md" style={{ backgroundColor: footerCfg.newsletterBtnBg, color: footerCfg.newsletterBtnText }}>{footerCfg.newsletterButtonText}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorField label="لون بداية التدرج" value={footerCfg.newsletterBgStart} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBgStart: v })} />
              <ColorField label="لون نهاية التدرج" value={footerCfg.newsletterBgEnd} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBgEnd: v })} />
              <ColorField label="لون النصوص والأيقونات" value={footerCfg.newsletterTextColor} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterTextColor: v })} />
              <ColorField label="لون زر الاشتراك" value={footerCfg.newsletterBtnBg} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBtnBg: v })} />
              <ColorField label="لون نص زر الاشتراك" value={footerCfg.newsletterBtnText} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBtnText: v })} />
            </div>
            <div className="mt-4">
              <ImageUploader label="صورة خلفية صندوق النشرة (اختياري)" value={footerCfg.newsletterBgImage} onChange={(v) => setFooterCfg({ ...footerCfg, newsletterBgImage: v })} hint="تظهر خلفية الصندوق بشكل خافت فوق التدرج اللوني — ارفع صورة بأبعاد واسعة مثل 1200x300" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Field label="نص حقل البريد (Placeholder)"><input value={footerCfg.newsletterInputPlaceholder} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterInputPlaceholder: e.target.value })} className={inputClass} disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="نص حقل البريد (English)"><input value={footerCfg.newsletterInputPlaceholder_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterInputPlaceholder_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="رسالة نجاح الاشتراك"><input value={footerCfg.newsletterSuccessText} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSuccessText: e.target.value })} className={inputClass} disabled={!footerCfg.showNewsletter} /></Field>
              <Field label="رسالة نجاح الاشتراك (English)"><input value={footerCfg.newsletterSuccessText_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, newsletterSuccessText_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showNewsletter} /></Field>
            </div>
          </SettingsSection>
          <SettingsSection title="نصوص شارات الثقة" icon={<ShieldCheck className="w-5 h-5" />}>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">الشارات الصغيرة أسفل اسم الموقع في التذييل — عدّل نصوصها.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="الشارة الأولى"><input value={footerCfg.trustBadge1} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge1: e.target.value })} className={inputClass} disabled={!footerCfg.showTrustBadges} /></Field>
              <Field label="الشارة الأولى (English)"><input value={footerCfg.trustBadge1_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge1_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showTrustBadges} /></Field>
              <Field label="الشارة الثانية"><input value={footerCfg.trustBadge2} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge2: e.target.value })} className={inputClass} disabled={!footerCfg.showTrustBadges} /></Field>
              <Field label="الشارة الثانية (English)"><input value={footerCfg.trustBadge2_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge2_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showTrustBadges} /></Field>
              <Field label="الشارة الثالثة"><input value={footerCfg.trustBadge3} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge3: e.target.value })} className={inputClass} disabled={!footerCfg.showTrustBadges} /></Field>
              <Field label="الشارة الثالثة (English)"><input value={footerCfg.trustBadge3_en || ''} onChange={(e) => setFooterCfg({ ...footerCfg, trustBadge3_en: e.target.value })} className={inputClass} dir="ltr" disabled={!footerCfg.showTrustBadges} /></Field>
            </div>
          </SettingsSection>
        </div>
      )}

      <div className="sticky bottom-4 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full sm:w-auto bg-white/95 backdrop-blur rounded-2xl shadow-xl shadow-slate-900/5 border border-gray-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 whitespace-nowrap"><Info className="w-3.5 h-3.5 text-gray-400" /> احفظ لتطبيق التغييرات على الموقع بالكامل</p>
          <button onClick={handleSave} disabled={saving} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: colors.primaryColor }}>
            <Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات والألوان'}
          </button>
        </div>
      </div>
      <ConfirmModal
        open={!!resetConfirm}
        onClose={() => setResetConfirm(null)}
        onConfirm={() => {
          if (resetConfirm === 'hero') setHeroCfg({ ...DEFAULT_HERO_CONFIG });
          else if (resetConfirm === 'footer') setFooterCfg({ ...DEFAULT_FOOTER_CONFIG });
          setResetConfirm(null);
        }}
        title={resetConfirm === 'hero' ? 'إعادة تعيين إعدادات الهيرو' : 'إعادة تعيين إعدادات التذييل'}
        message={resetConfirm === 'hero' ? 'هل أنت متأكد من إعادة تعيين إعدادات القسم الرئيسي إلى الافتراضي؟ جميع التغييرات الحالية ستُفقد.' : 'هل أنت متأكد من إعادة تعيين إعدادات التذييل إلى الافتراضي؟ جميع التغييرات الحالية ستُفقد.'}
        danger
        confirmLabel="إعادة التعيين"
      />
    </div>
  );
}
