import { createContext, useContext, useState, ReactNode } from 'react';
import type { Product } from '@/types';

interface OrderItem {
  product: Product;
  pharmacyName?: string;
}

interface OrderContextType {
  orderItem: OrderItem | null;
  orderModalOpen: boolean;
  openOrder: (product: Product, pharmacyName?: string) => void;
  closeOrder: () => void;
}

const OrderContext = createContext<OrderContextType>({
  orderItem: null,
  orderModalOpen: false,
  openOrder: () => {},
  closeOrder: () => {},
});

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orderItem, setOrderItem] = useState<OrderItem | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  const openOrder = (product: Product, pharmacyName?: string) => {
    setOrderItem({ product, pharmacyName });
    setOrderModalOpen(true);
  };

  const closeOrder = () => {
    setOrderModalOpen(false);
    setOrderItem(null);
  };

  return (
    <OrderContext.Provider value={{ orderItem, orderModalOpen, openOrder, closeOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  return useContext(OrderContext);
}
