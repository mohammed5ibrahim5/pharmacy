import { supabase } from '@/lib/supabase';

let lastTrackedAt = 0;
let lastTrackedPath = '';

function getSessionId(): string {
  let sid = sessionStorage.getItem('pharmacy_analytics_session');
  if (!sid) {
    sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('pharmacy_analytics_session', sid);
  }
  return sid;
}

/**
 * يسجّل زيارة صفحة في جدول page_views (fire-and-forget).
 * يُستدعى عند تغيير المسار. يوجد throttling لتفادي التكرار
 * من StrictMode ومكررات أحداث hashchange.
 */
export function trackPageView(path?: string): void {
  try {
    const now = Date.now();
    const p = path || window.location.pathname + window.location.hash;
    if (p === lastTrackedPath && now - lastTrackedAt < 2000) return;
    lastTrackedPath = p;
    lastTrackedAt = now;

    supabase
      .from('page_views')
      .insert({
        path: p.slice(0, 500),
        referrer: (document.referrer || '').slice(0, 500) || null,
        user_agent: (navigator.userAgent || '').slice(0, 500) || null,
        session_id: getSessionId(),
      })
      .then(
        () => {},
        () => {}
      );
  } catch {
    // تجاهل أي خطأ — التحليلات لا تعطّل التصفح
  }
}