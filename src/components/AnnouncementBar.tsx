import { Megaphone, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

function withAlpha(hex: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function AnnouncementBar() {
  const { settings, themeColors } = useSettings();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('announcement_dismissed');
    if (dismissed) setVisible(false);
  }, []);

  if (!settings.announcement_active || !settings.announcement_text || !visible) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem('announcement_dismissed', '1');
    setVisible(false);
  };

  return (
    <div
      className="relative text-sm py-3 px-4 overflow-hidden"
      style={{
        background: `linear-gradient(90deg, ${themeColors.announcementBg}, ${themeColors.secondaryColor}, ${themeColors.announcementBg})`,
        backgroundSize: '200% 100%',
        color: themeColors.announcementText,
      }}
    >
      <div className="absolute inset-0 animate-shimmer opacity-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%' }}
      />
      <div className="relative max-w-7xl mx-auto flex items-center justify-center gap-2.5 text-center">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 animate-pulse-soft"
          style={{ backgroundColor: withAlpha(themeColors.announcementText, 0.2) }}
        >
          <Megaphone className="w-4 h-4" />
        </span>
        <span className="font-medium">{settings.announcement_text}</span>
      </div>
      <button
        onClick={dismiss}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: themeColors.announcementText }}
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
