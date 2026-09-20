-- ============================================
-- حالة الدفع أونلاين + مرجع بوابة الدفع للطلبات
-- ============================================
ALTER TABLE public.order_groups
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.order_groups
  ADD COLUMN IF NOT EXISTS online_payment_ref text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';