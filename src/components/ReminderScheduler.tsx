import { useEffect, useRef } from 'react';
import { loadLocalReminders } from '@/lib/loyalty';
import { useSettings } from '@/context/SettingsContext';

export function ReminderScheduler() {
  const firedRef = useRef<Set<string>>(new Set());
  const { featuresConfig } = useSettings();

  useEffect(() => {
    if (!featuresConfig.reminders) return;
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    const check = () => {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      const timeNow = now.toTimeString().slice(0, 5);
      const reminders = loadLocalReminders();
      reminders.forEach((r) => {
        const key = `${r.id}|${todayKey}|${r.time}`;
        if (firedRef.current.has(key)) return;
        if (!r.days.includes(now.getDay())) return;
        const [h, m] = r.time.split(':').map(Number);
        const dueMin = h * 60 + m;
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (nowMin >= dueMin && nowMin <= dueMin + 2) {
          firedRef.current.add(key);
          new Notification('تذكير بأخذ الدواء 💊', {
            body: `${r.name}${r.dosage ? ` — ${r.dosage}` : ''}${r.note ? ` (${r.note})` : ''} في ${r.time}`,
            tag: key,
            silent: false,
          });
        }
        // allow re-fire on a future date
        if (!key.startsWith(`${r.id}|${todayKey}`)) {
          [...firedRef.current].forEach((k) => {
            if (k.startsWith(`${r.id}|`) && !k.includes(todayKey)) firedRef.current.delete(k);
          });
        }
      });
    };

    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [featuresConfig.reminders]);

  return null;
}
