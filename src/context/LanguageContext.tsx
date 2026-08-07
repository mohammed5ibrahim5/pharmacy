import { createContext, useContext, useCallback, useLayoutEffect, useState, ReactNode, useEffect } from 'react';
import { en } from '@/i18n/en';

export type Lang = 'ar' | 'en';

export type TranslateArgs = Record<string, string | number> | (string | number)[];

interface LanguageContextType {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: (str: string, args?: TranslateArgs) => string;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  dir: 'rtl',
  t: (s) => s,
  toggleLang: () => {},
});

function getInitialLang(): Lang {
  try {
    return localStorage.getItem('pharmacy-lang') === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

function isAdminPath() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(getInitialLang);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', isAdminPath() ? 'rtl' : lang === 'en' ? 'ltr' : 'rtl');
    root.setAttribute('lang', lang);
    try {
      localStorage.setItem('pharmacy-lang', lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  useEffect(() => {
    const forceRtlOnAdmin = () => {
      const root = document.documentElement;
      root.setAttribute('dir', isAdminPath() ? 'rtl' : lang === 'en' ? 'ltr' : 'rtl');
    };
    window.addEventListener('popstate', forceRtlOnAdmin);
    return () => window.removeEventListener('popstate', forceRtlOnAdmin);
  }, [lang]);

  const t = useCallback(
    (str: string, args?: TranslateArgs): string => {
      let out = lang === 'en' ? en[str] ?? str : str;
      if (args) {
        if (Array.isArray(args)) {
          args.forEach((v, i) => {
            out = out.replace(`{${i}}`, String(v));
          });
        } else {
          Object.entries(args).forEach(([k, v]) => {
            out = out.replace(`{${k}}`, String(v));
          });
        }
      }
      return out;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider
      value={{
        lang,
        dir: lang === 'en' ? 'ltr' : 'rtl',
        t,
        toggleLang: () => setLang((v) => (v === 'ar' ? 'en' : 'ar')),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
