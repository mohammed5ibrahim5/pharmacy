import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Product } from '@/types';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCustomer } from '@/context/CustomerContext';

export interface CartItem {
  key: string;
  product: Product;
  pharmacyName?: string;
  quantity: number;
}

export type CartStep = 'cart' | 'rx' | 'checkout';

interface OrderContextType {
  cart: CartItem[];
  cartOpen: boolean;
  cartStep: CartStep;
  cartCount: number;
  addToCart: (product: Product, pharmacyName?: string, quantity?: number) => boolean;
  updateCartQty: (key: string, quantity: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  openCart: (step?: CartStep) => void;
  closeCart: () => void;
  setCartStep: (step: CartStep) => void;
  openOrder: (product: Product, pharmacyName?: string) => void;
}

const CART_STORAGE_KEY = 'pharmacy_cart_v2';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

const OrderContext = createContext<OrderContextType>({
  cart: [],
  cartOpen: false,
  cartStep: 'cart',
  cartCount: 0,
  addToCart: () => true,
  updateCartQty: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  openCart: () => {},
  closeCart: () => {},
  setCartStep: () => {},
  openOrder: () => {},
});

export function OrderProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => loadCart());
  const [cartOpen, setCartOpen] = useState(false);
  const [cartStep, setCartStep] = useState<CartStep>('cart');
  const [notice, setNotice] = useState<string | null>(null);
  const { storeConfig } = useSettings();
  const { t } = useLanguage();
  const { user, setAuthModalOpen } = useCustomer();

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const notify = (message: string) => setNotice(message);

  const addToCart = (product: Product, pharmacyName?: string, quantity = 1): boolean => {
    if (!user) {
      notify(t('سجّل دخولك أولاً لإضافة المنتجات إلى السلة.'));
      setAuthModalOpen(true);
      return false;
    }
    // Check if product is available and has sufficient stock
    if (product.is_available === false) {
      notify(t('هذا المنتج غير متوفر حالياً.'));
      return false;
    }
    if (product.stock_quantity !== undefined && product.stock_quantity < quantity) {
      notify(t('المخزون المتاح: {0} وحدة فقط.', [String(product.stock_quantity)]));
      return false;
    }
    const catalogMode = !storeConfig.purchasesEnabled;
    if (catalogMode && !storeConfig.catalogMultiPharmacy && !product.for_all_pharmacies) {
      const cartPharmacyIds = new Set(
        cart
          .filter((i) => !i.product.for_all_pharmacies && i.product.pharmacy_id)
          .map((i) => i.product.pharmacy_id)
      );
      if (cartPharmacyIds.size > 0 && !cartPharmacyIds.has(product.pharmacy_id)) {
        notify(t('لا يمكن إضافة منتجات من أكثر من صيدلية في هذا الوضع، السلة مرتبطة بصيدلية واحدة فقط.'));
        return false;
      }
    }
    const key = `${product.id}:${product.pharmacy_id}`;
    // Check stock before calling setCart to avoid stale closure
    let stockWarning: string | null = null;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (product.stock_quantity !== undefined && product.stock_quantity < newQty) {
          stockWarning = t('المخزون المتاح: {0} وحدة فقط.', [String(product.stock_quantity)]);
          return prev;
        }
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: newQty } : i
        );
      }
      return [...prev, { key, product, pharmacyName, quantity }];
    });
    if (stockWarning) {
      notify(stockWarning);
      return false;
    }
    return true;
  };

  const updateCartQty = (key: string, quantity: number) => {
    if (!user) {
      notify(t('سجّل دخولك أولاً للوصول إلى سلة التسوق.'));
      setAuthModalOpen(true);
      return;
    }
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, quantity } : i)));
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  };

  const clearCart = () => setCart([]);

  const openCart = (step: CartStep = 'cart') => {
    if (!user) {
      notify(t('سجّل دخولك أولاً للوصول إلى سلة التسوق.'));
      setAuthModalOpen(true);
      return;
    }
    setCartStep(step);
    setCartOpen(true);
  };

  const closeCart = () => setCartOpen(false);

  const openOrder = (product: Product, pharmacyName?: string) => {
    addToCart(product, pharmacyName);
    openCart('cart');
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <OrderContext.Provider
      value={{
        cart,
        cartOpen,
        cartStep,
        cartCount,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        openCart,
        closeCart,
        setCartStep,
        openOrder,
      }}
    >
      {children}
      {notice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[90] max-w-[92vw] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  return useContext(OrderContext);
}
