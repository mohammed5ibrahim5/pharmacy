import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import type { Pharmacy, Product } from '@/types';

const STORAGE_KEY = 'pharmacy_compare_list_v1';
const MAX_COMPARE = 4;

export interface CompareContextType {
  compareList: Pharmacy[];
  isInCompare: (id: string) => boolean;
  toggleCompare: (pharmacy: Pharmacy) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  compareOpen: boolean;
  openCompare: () => void;
  closeCompare: () => void;
  barHidden: boolean;
  hideCompareBar: () => void;
  priceCompareProduct: Product | null;
  openPriceCompare: (product: Product) => void;
  closePriceCompare: () => void;
}

const CompareContext = createContext<CompareContextType>({
  compareList: [],
  isInCompare: () => false,
  toggleCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  compareOpen: false,
  openCompare: () => {},
  closeCompare: () => {},
  barHidden: false,
  hideCompareBar: () => {},
  priceCompareProduct: null,
  openPriceCompare: () => {},
  closePriceCompare: () => {},
});

function loadCompareList(): Pharmacy[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Pharmacy[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [compareList, setCompareList] = useState<Pharmacy[]>(() => loadCompareList());
  const [compareOpen, setCompareOpen] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const [priceCompareProduct, setPriceCompareProduct] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (compareList.length === 0) setBarHidden(false);
  }, [compareList.length]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const notify = useCallback((message: string) => setNotice(message), []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareList));
    } catch {
      // ignore storage errors
    }
  }, [compareList]);

  useEffect(() => {
    let active = true;
    (async () => {
      const ids = compareList.map((p) => p.id);
      if (ids.length === 0) return;
      const { data } = await supabase.from('pharmacies').select('id').in('id', ids);
      if (!active || !data) return;
      const valid = new Set(data.map((r) => r.id as string));
      setCompareList((prev) => prev.filter((p) => valid.has(p.id)));
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isInCompare = useCallback(
    (id: string) => compareList.some((p) => p.id === id),
    [compareList]
  );

  const toggleCompare = useCallback(
    (pharmacy: Pharmacy) => {
      const exists = compareList.some((p) => p.id === pharmacy.id);
      if (exists) {
        setCompareList((prev) => prev.filter((p) => p.id !== pharmacy.id));
        notify(t('تمت إزالة الصيدلية من المقارنة'));
        return;
      }
      const willReplace = compareList.length >= MAX_COMPARE;
      setCompareList((prev) =>
        prev.length >= MAX_COMPARE ? [...prev.slice(1), pharmacy] : [...prev, pharmacy]
      );
      notify(
        willReplace
          ? t('الحد الأقصى 4 صيدليات — تم استبدال الأقدم')
          : t('تمت إضافة الصيدلية للمقارنة')
      );
    },
    [compareList, notify, t]
  );

  const removeFromCompare = useCallback(
    (id: string) => {
      setCompareList((prev) => prev.filter((p) => p.id !== id));
      notify(t('تمت إزالة الصيدلية من المقارنة'));
    },
    [notify, t]
  );

  const clearCompare = useCallback(() => {
    setCompareList([]);
    notify(t('تم مسح قائمة المقارنة'));
  }, [notify, t]);
  const openCompare = useCallback(() => setCompareOpen(true), []);
  const closeCompare = useCallback(() => setCompareOpen(false), []);
  const hideCompareBar = useCallback(() => setBarHidden(true), []);
  const openPriceCompare = useCallback((product: Product) => setPriceCompareProduct(product), []);
  const closePriceCompare = useCallback(() => setPriceCompareProduct(null), []);

  return (
    <CompareContext.Provider
      value={{
        compareList,
        isInCompare,
        toggleCompare,
        removeFromCompare,
        clearCompare,
        compareOpen,
        openCompare,
        closeCompare,
        barHidden,
        hideCompareBar,
        priceCompareProduct,
        openPriceCompare,
        closePriceCompare,
      }}
    >
      {children}
      {notice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] max-w-[92vw] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  return useContext(CompareContext);
}
