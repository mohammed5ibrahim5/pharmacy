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

function parsePath(pathname: string): Route {
  const path = pathname.replace(/^\//, '');
  const parts = path.split('/').filter(Boolean);

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

function routeToPath(route: Route): string {
  switch (route.name) {
    case 'home': return '/';
    case 'search': return `/search/${encodeURIComponent(route.query)}`;
    case 'pharmacy': return `/pharmacy/${route.id}`;
    case 'category': return `/category/${route.slug}`;
    case 'categories': return '/categories';
    case 'account': return `/account/${route.tab}`;
    case 'track': return '/track';
    case 'health': return '/health';
    case 'healthArticle': return `/health/${encodeURIComponent(route.slug)}`;
  }
}

/** Backward-compatible: still read hash if present (migrating from old URLs) */
function getCurrentPath(): string {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#/') && hash.length > 2) {
    return hash.replace(/^#/, '');
  }
  return window.location.pathname;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parsePath(getCurrentPath()));
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = (newRoute: Route, opts?: { scrollToTop?: boolean }) => {
    const path = routeToPath(newRoute);
    const currentPath = getCurrentPath();
    if (currentPath !== path) {
      window.history.pushState({}, '', path);
    }
    setRoute(newRoute);
    setRefreshKey((k) => k + 1);
    if (opts?.scrollToTop !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handlePopState = () => setRoute(parsePath(getCurrentPath()));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const previousName = useRef(route.name);
  useEffect(() => {
    if (previousName.current !== route.name) {
      window.scrollTo({ top: 0 });
      void trackPageView(route.name);
    }
    previousName.current = route.name;
  }, [route]);

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
