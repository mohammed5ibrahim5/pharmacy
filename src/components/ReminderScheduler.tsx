import { useEffect, useRef } from 'react';
import { loadLocalReminders, medicationRunOutInfo } from '@/lib/loyalty';
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
      const reminders = loadLocalReminders();

      // 1) Dose-time reminders
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

      // 2) Run-out warning — once per day per medication
      reminders.forEach((r) => {
        const info = medicationRunOutInfo(r);
        if (info.daysLeft == null || info.status === 'ok') return;
        const outKey = `runout|${r.id}|${todayKey}`;
        if (firedRef.current.has(outKey)) return;
        firedRef.current.add(outKey);
        const label = info.status === 'out' ? 'انتهى الدواء' : `اقترب النفاد — متبقي ${info.daysLeft} يوم`;
        new Notification('تنبيه نفاد الدواء 💊', {
          body: `${r.name} ${label}. أعد طلبه الآن من أقرب صيدلية.`,
          tag: outKey,
          silent: false,
        });
      });
    };

    check();
    const interval = setInterval(check, 60 * 1000);
    return () => clearInterval(interval);
  }, [featuresConfig.reminders]);

  return null;
}
