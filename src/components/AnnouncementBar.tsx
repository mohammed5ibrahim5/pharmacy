import { Megaphone, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';

export function AnnouncementBar() {
  const { settings } = useSettings();
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
      className="relative text-white text-sm py-3 px-4 overflow-hidden"
      style={{
        background: `linear-gradient(90deg, ${settings.primary_color}, ${settings.secondary_color}, ${settings.primary_color})`,
        backgroundSize: '200% 100%',
      }}
    >
      <div className="absolute inset-0 animate-shimmer opacity-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%' }}
      />
      <div className="relative max-w-7xl mx-auto flex items-center justify-center gap-2.5 text-center">
        <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 animate-pulse-soft">
          <Megaphone className="w-4 h-4" />
        </span>
        <span className="font-medium">{settings.announcement_text}</span>
      </div>
      <button
        onClick={dismiss}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
