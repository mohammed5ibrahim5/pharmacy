import { useState } from 'react';
import { Phone, Mail, MapPin, Facebook, Instagram, Twitter, MessageCircle, Cross, Heart, Shield, Truck, Clock, Send, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';

function withAlpha(hex: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

function isDarkColor(hex: string): boolean {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 130;
}

export function Footer() {
  const { settings, themeColors, footerConfig } = useSettings();
  const { navigate } = useRouter();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const footerBg = themeColors.footerBg || '#0f172a';
  const footerText = themeColors.footerText || '#cbd5e1';
  const primary = themeColors.primaryColor || '#0d9488';
  const secondary = themeColors.secondaryColor || '#0f766e';
  const dark = isDarkColor(footerBg);

  const muted = withAlpha(footerText, 0.7);
  const faint = withAlpha(footerText, 0.5);
  const border = withAlpha(footerText, 0.16);
  const chipBg = withAlpha(primary, 0.12);
  const hoverText = dark ? '#ffffff' : '#0f172a';

  const quickLinks = [
    { label: 'الصفحة الرئيسية', action: () => navigate({ name: 'home' }) },
    { label: 'البحث عن دواء أو منتج', action: () => navigate({ name: 'search', query: '' }) },
    { label: 'عروض وخصومات الأدوية', action: () => navigate({ name: 'search', query: 'خصم' }) },
    { label: 'صيدليات تعمل 24 ساعة', action: () => navigate({ name: 'category', slug: '24h' }) },
    { label: 'مركز المساعدة والتواصل', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setNewsletterEmail('');
      }, 3000);
    }
  };

  const sectionTitle = (label: string) => (
    <h4 className="text-sm font-black tracking-wide relative pb-2.5 mb-5">
      <span style={{ color: footerText }}>{label}</span>
      <span
        className="absolute right-0 bottom-0 h-[3px] w-9 rounded-full"
        style={{ backgroundColor: primary, boxShadow: `0 0 12px ${withAlpha(primary, 0.5)}` }}
      />
    </h4>
  );

  return (
    <footer
      className="relative mt-20 overflow-hidden border-t transition-all duration-300"
      style={{
        backgroundColor: footerBg,
        color: footerText,
        borderColor: border,
      }}
    >
      {/* Background decor */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 right-0 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{ backgroundColor: primary, opacity: dark ? 0.09 : 0.07 }}
        />
        <div
          className="absolute -bottom-44 -left-32 w-[440px] h-[440px] rounded-full blur-3xl"
          style={{ backgroundColor: secondary, opacity: dark ? 0.07 : 0.06 }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(${withAlpha(primary, dark ? 0.08 : 0.06)} 1px, transparent 1px)`,
            backgroundSize: '26px 26px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Newsletter CTA */}
        {footerConfig.showNewsletter && (
          <div
            className="mb-14 p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            <div
              className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)`,
                backgroundSize: '18px 18px',
              }}
            />
            <div className="flex items-center gap-4 relative">
              <div className="w-12 h-12 rounded-2xl bg-white/15 text-white flex items-center justify-center shrink-0 border border-white/25 backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">{footerConfig.newsletterTitle}</h4>
                <p className="text-xs text-white/80 mt-0.5 font-medium">{footerConfig.newsletterSubtitle}</p>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="w-full md:w-auto flex items-center gap-2 max-w-md relative">
              {subscribed ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 text-white border border-white/30 text-xs font-bold w-full backdrop-blur-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  تم الاشتراك بنجاح في نشرة {settings.site_name}!
                </div>
              ) : (
                <>
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="أدخل بريدك الإلكتروني..."
                    required
                    aria-label="البريد الإلكتروني"
                    className="flex-1 min-w-0 px-4 py-2.5 bg-white/10 border border-white/25 rounded-2xl text-xs text-white placeholder:text-white/60 focus:outline-none focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-white text-primary font-extrabold text-xs transition-transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-1.5 shrink-0"
                    style={{ color: primary }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {footerConfig.newsletterButtonText}
                  </button>
                </>
              )}
            </form>
          </div>
        )}

        {/* Main columns */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12 ${!footerConfig.showNewsletter ? 'mt-4' : ''}`}>
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: primary, boxShadow: `0 8px 20px -4px ${withAlpha(primary, 0.45)}` }}
              >
                <Cross className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black" style={{ color: dark ? '#ffffff' : '#0f172a' }}>
                  {settings.site_name}
                </h3>
                <p className="text-xs font-medium" style={{ color: muted }}>{footerConfig.footerTagline}</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed font-medium" style={{ color: muted }}>
              {settings.site_description || settings.site_tagline}
            </p>

            {footerConfig.showTrustBadges && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border"
                  style={{ backgroundColor: chipBg, borderColor: withAlpha(primary, 0.25), color: footerText }}
                >
                  <Shield className="w-3.5 h-3.5" style={{ color: primary }} />
                  طبي موثوق
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border"
                  style={{ backgroundColor: chipBg, borderColor: withAlpha(primary, 0.25), color: footerText }}
                >
                  <Truck className="w-3.5 h-3.5" style={{ color: primary }} />
                  توصيل 24 ساعة
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border"
                  style={{ backgroundColor: chipBg, borderColor: withAlpha(primary, 0.25), color: footerText }}
                >
                  <Clock className="w-3.5 h-3.5" style={{ color: primary }} />
                  خدمة على مدار اليوم
                </span>
              </div>
            )}
          </div>

          {/* Quick Links */}
          {footerConfig.showQuickLinks && (
            <div>
              {sectionTitle(footerConfig.quickLinksTitle)}
              <ul className="space-y-3 text-xs font-semibold">
                {quickLinks.map((link, i) => (
                  <li key={i}>
                    <button
                      onClick={link.action}
                      className="flex items-center gap-2.5 transition-all duration-200 group"
                      style={{ color: muted }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = hoverText)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full transition-all duration-200 group-hover:w-3.5"
                        style={{ backgroundColor: primary }}
                      />
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contact */}
          {footerConfig.showContactSection && (
            <div>
              {sectionTitle(footerConfig.contactTitle)}
              <ul className="space-y-3.5 text-xs font-semibold">
              {settings.contact_address && (
                <li className="flex items-start gap-3">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: chipBg, borderColor: withAlpha(primary, 0.25), color: primary }}
                  >
                    <MapPin className="w-4 h-4" />
                  </span>
                  <span className="pt-1.5 leading-relaxed" style={{ color: muted }}>{settings.contact_address}</span>
                </li>
              )}
              {settings.contact_phone && (
                <li className="flex items-center gap-3 group">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: chipBg, borderColor: withAlpha(primary, 0.25), color: primary }}
                  >
                    <Phone className="w-4 h-4" />
                  </span>
                  <a
                    href={`tel:${settings.contact_phone}`}
                    className="transition-colors"
                    dir="ltr"
                    style={{ color: muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                  >
                    {settings.contact_phone}
                  </a>
                </li>
              )}
              {settings.contact_whatsapp && (
                <li className="flex items-center gap-3 group">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: chipBg, borderColor: withAlpha(primary, 0.25), color: primary }}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </span>
                  <a
                    href={`https://wa.me/${settings.contact_whatsapp}`}
                    className="transition-colors"
                    dir="ltr"
                    style={{ color: muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                  >
                    {settings.contact_whatsapp}
                  </a>
                </li>
              )}
              {settings.contact_email && (
                <li className="flex items-center gap-3 group">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: chipBg, borderColor: withAlpha(primary, 0.25), color: primary }}
                  >
                    <Mail className="w-4 h-4" />
                  </span>
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="transition-colors break-all"
                    dir="ltr"
                    style={{ color: muted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = primary)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = muted)}
                  >
                    {settings.contact_email}
                  </a>
                </li>
              )}
            </ul>
          </div>
          )}

          {/* Social */}
          {footerConfig.showSocialSection && (
            <div>
              {sectionTitle(footerConfig.socialTitle)}
              <div className="flex gap-2.5 mb-5">
                {settings.facebook_url && (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="فيسبوك"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:-translate-y-1 border"
                    style={{ backgroundColor: chipBg, borderColor: border, color: primary }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1877f2', e.currentTarget.style.borderColor = 'transparent', e.currentTarget.style.color = '#ffffff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = chipBg, e.currentTarget.style.borderColor = border, e.currentTarget.style.color = primary)}
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="إنستغرام"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:-translate-y-1 border"
                    style={{ backgroundColor: chipBg, borderColor: border, color: primary }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(45deg,#f09433,#dc2743,#bc1888)', e.currentTarget.style.borderColor = 'transparent', e.currentTarget.style.color = '#ffffff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = chipBg, e.currentTarget.style.borderColor = border, e.currentTarget.style.color = primary)}
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings.twitter_url && (
                  <a
                    href={settings.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="تويتر"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:-translate-y-1 border"
                    style={{ backgroundColor: chipBg, borderColor: border, color: primary }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#0f172a', e.currentTarget.style.borderColor = 'transparent', e.currentTarget.style.color = '#ffffff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = chipBg, e.currentTarget.style.borderColor = border, e.currentTarget.style.color = primary)}
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
              </div>
              <p className="text-xs font-medium leading-relaxed" style={{ color: faint }}>
                {footerConfig.socialText}
              </p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium"
          style={{ borderTop: `1px solid ${border}`, color: faint }}
        >
          {footerConfig.showCopyright && (
            <p className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" style={{ color: primary }} fill={primary} />
              <span>
                {settings.footer_text} © {new Date().getFullYear()} {settings.site_name} - جميع الحقوق محفوظة
              </span>
            </p>
          )}
          {footerConfig.showBottomNotice && (
            <p className="text-[11px]">{footerConfig.bottomNoticeText}</p>
          )}
        </div>
      </div>
    </footer>
  );
}
