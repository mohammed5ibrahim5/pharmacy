-- ============================================
-- إضافة عمود الملح (salt) لتشفير كلمة مرور المالك
-- SHA-256 + ملح عشوائي بدلاً من التشفير البسيط السابق
-- شغّل هذا الملف في Supabase SQL Editor
-- ============================================

ALTER TABLE pharmacy_owners
  ADD COLUMN IF NOT EXISTS password_salt text;
