import type { Pharmacy, Product, FamilyMember } from '@/types';
import {
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
} from 'lucide-react';
import React from 'react';

export interface OrderRecord {
  id: string;
  product_id: string;
  pharmacy_id: string;
  quantity: number;
  total_price: number;
  address: string | null;
  note: string | null;
  status: string;
  payment_method: string | null;
  payment_number: string | null;
  payment_screenshot_url: string | null;
  payment_status?: string;
  order_group_id?: string | null;
  created_at: string;
  family_member_id: string | null;
  product?: Product;
  pharmacy?: Pharmacy;
  family_member?: FamilyMember;
  order_group?: OrderGroupSub | null;
}

export interface OrderGroupSub {
  id: string;
  status: string;
  payment_method: string | null;
  payment_status?: string;
  total_price?: number;
  created_at?: string;
}

export interface AddressRecord {
  id: string;
  title: string;
  address: string;
  phone?: string;
}

export const ADDRESSES_KEY = 'pharmacy_addresses';

export const STATUS_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'قيد المعالجة',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  confirmed: {
    label: 'تم تأكيد الدفع',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/25',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  shipped: {
    label: 'تم الشحن - في الطريق',
    className: 'bg-violet-500/10 text-violet-500 border-violet-500/25',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  delivered: {
    label: 'تم التسليم',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'ملغي',
    className: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export const ORDER_TRACK_STEPS = [
  { key: 'pending', label: 'قيد المراجعة', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'confirmed', label: 'تم التأكيد', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: 'shipped', label: 'في الطريق', icon: <Truck className="w-3.5 h-3.5" /> },
  { key: 'delivered', label: 'تم التسليم', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];
