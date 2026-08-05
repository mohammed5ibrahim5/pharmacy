-- ============================================
-- بيانات تجريبية (Seed Data) مع صور للموقع
-- ============================================
-- يضيف فئات وصيدليات ومنتجات بأمثلة واقعية مع روابط صور
-- يمكن تشغيله في Supabase SQL Editor بعد تشغيل ملف الـ schema الأساسي

-- ============================================
-- الفئات
-- ============================================
INSERT INTO categories (name, name_en, slug, icon) VALUES
  ('مسكنات الألم', 'Painkillers', 'painkillers', 'pill'),
  ('مضادات حيوية', 'Antibiotics', 'antibiotics', 'shield'),
  ('مكملات غذائية', 'Supplements', 'supplements', 'sparkles'),
  ('أدوية البرد والإنفلونزا', 'Cold & Flu', 'cold-flu', 'stethoscope'),
  ('فيتامينات', 'Vitamins', 'vitamins', 'heartpulse'),
  ('العناية بالبشرة', 'Skin Care', 'skin-care', 'droplet'),
  ('مستلزمات الأطفال', 'Baby Care', 'baby-care', 'baby'),
  ('أدوية الجهاز الهضمي', 'Digestive', 'digestive', 'activity')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- الصيدليات
-- ============================================
INSERT INTO pharmacies (name, description, logo_url, cover_url, phone, whatsapp, email, address, area, city, latitude, longitude, is_active, rating, delivery_available, delivery_fee, opening_hours, is_24h, has_parking, accept_insurance, pharmacy_type) VALUES
  ('صيدلية النور', 'صيدلية حديثة تقدم خدمات طبية متكاملة وأدوية أصلية بأسعار منافسة', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&q=80', 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80', '01012345678', '201012345678', 'noor@pharmacy.com', 'شارع التحرير، ميدان التحرير', 'وسط البلد', 'القاهرة', 30.0444, 31.2357, true, 4.8, true, 25, '9:00 ص - 11:00 م', false, true, true, 'حديثة'),
  ('صيدلية الشفاء', 'صيدلية شعبية عريقة تخدم الحي منذ أكثر من 25 عاماً', 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=200&q=80', 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=1200&q=80', '01098765432', '201098765432', 'shifa@pharmacy.com', 'شارع الملك فيصل', 'الهرم', 'الجيزة', 30.0081, 31.2085, true, 4.5, true, 20, '8:00 ص - 12:00 م', false, false, true, 'شعبية'),
  ('صيدلية الدواء', 'صيدلية متخصصة في الأدوية المستوردة والحديثة', 'https://images.unsplash.com/photo-1629425733761-caae3b5f2e50?w=200&q=80', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&q=80', '01111223344', '201111223344', 'dawa@pharmacy.com', 'شارع النصر، مدينة نصر', 'مدينة نصر', 'القاهرة', 30.0359, 31.3296, true, 4.9, true, 30, '24 ساعة', true, true, true, 'متخصصة'),
  ('صيدلية الحياة', 'صيدلية عائلية تقدم جميع المنتجات الطبية والتجميلية', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&q=80', 'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?w=1200&q=80', '01055667788', '201055667788', 'haya@pharmacy.com', 'شارع الهرم الرئيسي', 'الجيزة', 'الجيزة', 30.0098, 31.2087, true, 4.3, true, 15, '9:00 ص - 10:00 م', false, true, false, 'حديثة'),
  ('صيدلية العائلة', 'أكبر صيدلية في المنطقة مع قسم خاص لمستلزمات الأطفال', 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=200&q=80', 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&q=80', '01223344556', '201223344556', 'family@pharmacy.com', 'شارع التسعين، التجمع الخامس', 'التجمع الخامس', 'القاهرة', 30.0120, 31.4380, true, 4.7, true, 35, '10:00 ص - 12:00 م', false, true, true, 'حديثة')
ON CONFLICT DO NOTHING;

-- ============================================
-- المنتجات
-- ============================================
-- ملاحظة: تستخدم هذه البيانات الصيدليات الخمسة المضافة أعلاه.
-- نستخدم SUBQUERY للحصول على معرفات الصيدليات والفئات.

-- مسكنات الألم
INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'بانادول', 'Panadol', 'مسكن ألم خافض للحرارة', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80', 25.00, 'شريط', p.id, c.id, true, false, 'باراسيتامول', 'GSK', 'أقراص', '500mg', 100
FROM pharmacies p, categories c WHERE p.name = 'صيدلية النور' AND c.slug = 'painkillers';

INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'بروفين', 'Brufen', 'مسكن ألم ومضاد التهاب', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&q=80', 35.00, 'شريط', p.id, c.id, true, false, 'ايبوبروفين', 'Abbott', 'أقراص', '400mg', 80
FROM pharmacies p, categories c WHERE p.name = 'صيدلية الشفاء' AND c.slug = 'painkillers';

INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'فولتارين', 'Voltaren', 'جل مسكن للآلام الموضعية', 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&q=80', 45.00, 'أنبوب', p.id, c.id, true, false, 'ديكلوفيناك', 'Novartis', 'كريم', '1%', 60
FROM pharmacies p, categories c WHERE p.name = 'صيدلية الدواء' AND c.slug = 'painkillers';

-- مضادات حيوية
INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'أوجمنتين', 'Augmentin', 'مضاد حيوي واسع الطيف', 'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?w=400&q=80', 85.00, 'شريط', p.id, c.id, true, true, 'أموكسيسيلين/كلافولانيك', 'GSK', 'أقراص', '625mg', 50
FROM pharmacies p, categories c WHERE p.name = 'صيدلية الحياة' AND c.slug = 'antibiotics';

INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'أموكسيسيلين', 'Amoxicillin', 'مضاد حيوي للالتهابات البكتيرية', 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80', 40.00, 'شريط', p.id, c.id, true, true, 'أموكسيسيلين', 'Glaxo', 'كبسولات', '500mg', 70
FROM pharmacies p, categories c WHERE p.name = 'صيدلية العائلة' AND c.slug = 'antibiotics';

-- مكملات غذائية
INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'أوميجا 3', 'Omega 3', 'مكمل غذائي لصحة القلب والدماغ', 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&q=80', 120.00, 'علبة', p.id, c.id, true, false, 'أحماض أوميجا 3', 'Seven Seas', 'كبسولات', '1000mg', 45
FROM pharmacies p, categories c WHERE p.name = 'صيدلية النور' AND c.slug = 'supplements';

INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'بروتين مسحوق', 'Whey Protein', 'بروتين لبناء العضلات', 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362b?w=400&q=80', 350.00, 'علبة', p.id, c.id, true, false, 'بروتين مصل اللبن', 'Optimum', 'مسحوق', '1kg', 30
FROM pharmacies p, categories c WHERE p.name = 'صيدلية الدواء' AND c.slug = 'supplements';

-- فيتامينات
INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'فيتامين د', 'Vitamin D', 'فيتامين د لتقوية المناعة', 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80', 55.00, 'علبة', p.id, c.id, true, false, 'فيتامين د3', 'Centrum', 'كبسولات', '1000IU', 90
FROM pharmacies p, categories c WHERE p.name = 'صيدلية الشفاء' AND c.slug = 'vitamins';

INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'فيتامين سي', 'Vitamin C', 'فيتامين سي مع الزنك', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&q=80', 65.00, 'علبة', p.id, c.id, true, false, 'فيتامين سي', 'Redoxon', 'أقراص فوارة', '1000mg', 120
FROM pharmacies p, categories c WHERE p.name = 'صيدلية العائلة' AND c.slug = 'vitamins';

-- أدوية البرد والإنفلونزا
INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'كونجستال', 'Congestal', 'علاج فعال للبرد والإنفلونزا', 'https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?w=400&q=80', 30.00, 'كيس', p.id, c.id, true, false, 'باراسيتامول/سودوإيفيدرين', 'Novartis', 'أقراص فوارة', '500mg', 85
FROM pharmacies p, categories c WHERE p.name = 'صيدلية الحياة' AND c.slug = 'cold-flu';

INSERT INTO products (name, name_en, description, image_url, price, unit, pharmacy_id, category_id, is_available, requires_prescription, active_ingredient, manufacturer, form, dosage, stock_quantity) 
SELECT 'فلورست', 'Florest', 'شراب للسعال والبرد', 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&q=80', 20.00, 'زجاجة', p.id, c.id, true, false, 'دكسترومثورفان', 'GSK', 'شراب', '120ml', 75
FROM pharmacies p, categories c WHERE p.name = 'صيدلية النور' AND c.slug = 'cold-flu';

-- ============================================
-- الخصومات
-- ============================================
INSERT INTO discounts (product_id, pharmacy_id, discount_percentage, is_active) 
SELECT pr.id, pr.pharmacy_id, 15, true
FROM products pr WHERE pr.name = 'بانادول';

INSERT INTO discounts (product_id, pharmacy_id, discount_percentage, is_active) 
SELECT pr.id, pr.pharmacy_id, 20, true
FROM products pr WHERE pr.name = 'أوجمنتين';

INSERT INTO discounts (product_id, pharmacy_id, discount_percentage, is_active) 
SELECT pr.id, pr.pharmacy_id, 10, true
FROM products pr WHERE pr.name = 'فيتامين د';
