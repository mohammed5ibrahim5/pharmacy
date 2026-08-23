-- ============================================
-- تفعيل Realtime على جدول الروشتات (لتنبيه العداد الفوري في الأدمن)
-- ============================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.prescriptions REPLICA IDENTITY FULL;
