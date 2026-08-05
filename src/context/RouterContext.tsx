import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AccountTab = 'orders' | 'prescriptions' | 'addresses' | 'favorites';

type Route =
  | { name: 'home' }
  | { name: 'search'; query: string }
  | { name: 'pharmacy'; id: string }
  | { name: 'category'; slug: string }
  | { name: 'account'; tab: AccountTab };

interface RouterContextType {
  route: Route;
  navigate: (route: Route) => void;
}

const RouterContext = createContext<RouterContextType>({
  route: { name: 'home' },
  navigate: () => {},
});

function parseAccountTab(tab?: string): AccountTab {
  if (tab === 'prescriptions' || tab === 'addresses' || tab === 'favorites') return tab;
  return 'orders';
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'search' && parts[1]) return { name: 'search', query: decodeURIComponent(parts[1]) };
  if (parts[0] === 'pharmacy' && parts[1]) return { name: 'pharmacy', id: parts[1] };
  if (parts[0] === 'category' && parts[1]) return { name: 'category', slug: parts[1] };
  if (parts[0] === 'account') return { name: 'account', tab: parseAccountTab(parts[1]) };
  return { name: 'home' };
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'search': return `#/search/${encodeURIComponent(route.query)}`;
    case 'pharmacy': return `#/pharmacy/${route.id}`;
    case 'category': return `#/category/${route.slug}`;
    case 'account': return `#/account/${route.tab}`;
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());

  const navigate = (newRoute: Route) => {
    const hash = routeToHash(newRoute);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    setRoute(newRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <RouterContext.Provider value={{ route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
