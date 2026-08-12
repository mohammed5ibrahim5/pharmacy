-- إضافة عمود ترتيب الفئات في شريط التصفح تحت الهيدر
-- يظهر الفئة الأقل رقماً أولاً؛ الفئات بدون قيمة تظهر آخراً بترتيب أبجدي
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order integer;

UPDATE categories SET sort_order = 10 WHERE slug = 'painkillers';
UPDATE categories SET sort_order = 20 WHERE slug = 'antibiotics';
UPDATE categories SET sort_order = 30 WHERE slug = 'supplements';
UPDATE categories SET sort_order = 40 WHERE slug = 'cold-flu';
UPDATE categories SET sort_order = 50 WHERE slug = 'vitamins';
UPDATE categories SET sort_order = 60 WHERE slug = 'skin-care';
UPDATE categories SET sort_order = 70 WHERE slug = 'baby-care';
UPDATE categories SET sort_order = 80 WHERE slug = 'digestive';
