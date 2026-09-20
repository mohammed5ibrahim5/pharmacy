-- ============================================
-- تفعيل Realtime للتتبع الحي للإشعارات والطلبات
-- ============================================
DO $$
BEGIN
  -- إضافة الجداول للنشر مع تجاهل لو موجودة بالفعل
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_groups;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.order_groups REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;