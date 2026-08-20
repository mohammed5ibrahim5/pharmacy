-- ============================================
-- إعادة ضبط ألوان الموقع إلى الافتراضي
-- (بعد إزالة قسم الألوان من لوحة الأدمن)
-- ============================================

UPDATE public.site_settings
SET primary_color = '#0d9488',
    secondary_color = '#0f766e',
    accent_color = '#f59e0b',
    updated_at = now()
WHERE primary_color IS DISTINCT FROM '#0d9488'
   OR secondary_color IS DISTINCT FROM '#0f766e'
   OR accent_color IS DISTINCT FROM '#f59e0b';

-- حذف themeColors من features_json كي يرجع التطبيق للقيم الافتراضية في الكود
UPDATE public.site_settings
SET features_json = (features_json::jsonb - 'themeColors')::text,
    updated_at = now()
WHERE features_json IS NOT NULL
  AND (features_json::jsonb) ? 'themeColors';