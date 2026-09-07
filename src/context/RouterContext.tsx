import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { trackPageView } from '@/lib/analytics';

export type AccountTab = 'orders' | 'prescriptions' | 'addresses' | 'favorites' | 'rewards' | 'reminders' | 'family' | 'subscriptions';

type Route =
  | { name: 'home' }
  | { name: 'search'; query: string }
  | { name: 'pharmacy'; id: string }
  | { name: 'category'; slug: string }
  | { name: 'categories' }
  | { name: 'account'; tab: AccountTab }
  | { name: 'track' }
  | { name: 'health' }
  | { name: 'healthArticle'; slug: string };

interface RouterContextType {
  route: Route;
  navigate: (route: Route, opts?: { scrollToTop?: boolean }) => void;
  refreshKey: number;
}

const RouterContext = createContext<RouterContextType>({
  route: { name: 'home' },
  navigate: () => {},
  refreshKey: 0,
});

function parseAccountTab(tab?: string): AccountTab {
  if (tab === 'prescriptions' || tab === 'addresses' || tab === 'favorites' || tab === 'rewards' || tab === 'reminders' || tab === 'subscriptions') return tab;
  return 'orders';
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'search' && parts[1]) return { name: 'search', query: decodeURIComponent(parts[1]) };
  if (parts[0] === 'pharmacy' && parts[1]) return { name: 'pharmacy', id: parts[1] };
  if (parts[0] === 'category' && parts[1]) return { name: 'category', slug: parts[1] };
  if (parts[0] === 'categories') return { name: 'categories' };
  if (parts[0] === 'account') return { name: 'account', tab: parseAccountTab(parts[1]) };
  if (parts[0] === 'track') return { name: 'track' };
  if (parts[0] === 'health' && parts[1]) return { name: 'healthArticle', slug: decodeURIComponent(parts[1]) };
  if (parts[0] === 'health') return { name: 'health' };
  return { name: 'home' };
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'search': return `#/search/${encodeURIComponent(route.query)}`;
    case 'pharmacy': return `#/pharmacy/${route.id}`;
    case 'category': return `#/category/${route.slug}`;
    case 'categories': return '#/categories';
    case 'account': return `#/account/${route.tab}`;
    case 'track': return '#/track';
    case 'health': return '#/health';
    case 'healthArticle': return `#/health/${encodeURIComponent(route.slug)}`;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (newRoute: Route, opts?: { scrollToTop?: boolean }) => {
    const hash = routeToHash(newRoute);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    setRoute(newRoute);
    // Force dependents (e.g. SearchPage) to re-run even when the hash/query
    // is unchanged, so pressing Enter always re-searches.
    setRefreshKey((k) => k + 1);
    if (opts?.scrollToTop !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Scroll back to the top only when switching to a different page/route,
  // not when switching tabs inside the same page (e.g. account tabs).
  const previousName = useRef(route.name);
  useEffect(() => {
    if (previousName.current !== route.name) {
      window.scrollTo({ top: 0 });
      void trackPageView(route.name);
    }
    previousName.current = route.name;
  }, [route]);

  // تسجيل أول زيارة عند فتح الموقع
  useEffect(() => {
    void trackPageView(route.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate, refreshKey }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
