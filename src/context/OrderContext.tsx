import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Product } from '@/types';

export interface CartItem {
  key: string;
  product: Product;
  pharmacyName?: string;
  quantity: number;
}

export type CartStep = 'cart' | 'checkout';

interface OrderContextType {
  cart: CartItem[];
  cartOpen: boolean;
  cartStep: CartStep;
  cartCount: number;
  addToCart: (product: Product, pharmacyName?: string, quantity?: number) => void;
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
  addToCart: () => {},
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

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  const addToCart = (product: Product, pharmacyName?: string, quantity = 1) => {
    const key = `${product.id}:${product.pharmacy_id}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { key, product, pharmacyName, quantity }];
    });
  };

  const updateCartQty = (key: string, quantity: number) => {
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
    </OrderContext.Provider>
  );
}

export function useOrder() {
  return useContext(OrderContext);
}
