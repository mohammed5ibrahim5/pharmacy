-- ============================================
-- تفعيل Realtime للتتبع الحي للإشعارات والطلبات
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.order_groups REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;