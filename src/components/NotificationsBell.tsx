import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, FileText, PackageCheck, Sparkles, Inbox } from 'lucide-react';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';
import { useLanguage, type TranslateArgs } from '@/context/LanguageContext';
import { fetchNotifications, markNotificationsRead, type AppNotification } from '@/lib/notifications';

function timeAgo(iso: string, t: (str: string, args?: TranslateArgs) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('الآن');
  if (mins < 60) return t('منذ {0} دقيقة', [mins]);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('منذ {0} ساعة', [hours]);
  const days = Math.floor(hours / 24);
  return t('منذ {0} يوم', [days]);
}

function typeIcon(type: string) {
  if (type === 'prescription') return <FileText className="w-4 h-4 text-blue-600" />;
  if (type === 'order') return <PackageCheck className="w-4 h-4 text-teal-600" />;
  return <Sparkles className="w-4 h-4 text-amber-500" />;
}

export function NotificationsBell() {
  const { user } = useCustomer();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const load = async () => {
    if (!user) return;
    setItems(await fetchNotifications(user.id));
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('customer-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `customer_id=eq.${user.id}` },
        () => {
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markNotificationsRead(user.id);
    setItems(items.map((n) => ({ ...n, read: true })));
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!open) load();
          setOpen(!open);
        }}
        className="relative p-2.5 rounded-2xl border transition-colors"
        style={{
          backgroundColor: `${themeColors.headerText}08`,
          color: themeColors.headerText,
          borderColor: `${themeColors.headerText}15`,
        }}
        aria-label={t('الإشعارات')}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute start-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/70">
            <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
              {t('الإشعارات')}
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">{t('{0} جديد', [unread])}</span>
              )}
            </h4>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:bg-teal-50 px-2 py-1 rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('قراءة الكل')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-500">{t('لا توجد إشعارات بعد')}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{t('ستصلك هنا تحديثات روشتاتك وطلباتك فوراً')}</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    navigate({ name: 'account', tab: n.type === 'prescription' ? 'prescriptions' : 'orders' });
                  }}
                  className={`w-full text-start px-4 py-3 flex items-start gap-3 transition-colors hover:bg-teal-50/40 ${n.read ? 'opacity-70' : ''}`}
                >
                  <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100">
                    {typeIcon(n.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-gray-900 truncate">{t(n.title)}</span>
                      {!n.read && <span className="w-2 h-2 shrink-0 rounded-full bg-red-500" />}
                    </span>
                    {n.body && <span className="block text-[11px] text-gray-500 mt-0.5 leading-relaxed">{t(n.body)}</span>}
                    <span className="block text-[10px] text-gray-400 font-bold mt-1">{timeAgo(n.created_at, t)}</span>
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100">
            <button
              onClick={() => {
                setOpen(false);
                navigate({ name: 'account', tab: 'prescriptions' });
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-[11px] font-bold hover:brightness-110 active:scale-[0.98] transition-all"
              style={{ backgroundColor: themeColors.primaryColor }}
            >
              <FileText className="w-3.5 h-3.5" />
              {t('متابعة روشتاتي في حسابي')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
