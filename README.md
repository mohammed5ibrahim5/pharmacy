# صيدليتي — Pharmacy Platform

منصّة صيدليات متكاملة: ويب لклиبين + تطبيق Flutter + API.

## بنية المستودع

```
pharmacy/
├── project/          ← تطبيق الويب (React + Vite + TypeScript)  ← المشروع الأساسي
├── dawai_app/        ← تطبيق Flutter (Android / Windows)
├── .github/workflows ← CI: فحص الويب على كل push
├── .vscode/          ← إعدادات التشغيل بنقرة واحدة
├── release.ps1       ← سكريبت نشر نسخ Android
└── version.json      ← رقم الإصدار الحالي
```

## التشغيل

**من VS Code:** `Ctrl+Shift+B` ← يشغّل سيرفر الويب تلقائياً، ثم `F5` لفتحه في Chrome.

**من الطرفية:**

```bash
cd project
npm install        # أول مرة فقط
npm run dev        # http://localhost:5173
```

## أوامر project/

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | سيرفر التطوير (بورت 5173 ثابت) |
| `npm run build` | بناء الإنتاج في `dist/` |
| `npm run preview` | معاينة نسخة الإنتاج |
| `npm run typecheck` | فحص الأنواع |
| `npm run lint` | فحص ESLint |
| `npm run test` | تشغيل اختبارات Vitest |

## بنية src/

```
src/
├── components/       مكوّنات العرض، مقسّمة حسب الوظيفة
│   ├── layout/       الهيكل العام: Header, Footer, MobileBottomNav…
│   ├── home/         أقسام صفحة الرئيسية
│   ├── modals/       النوافذ المنبثقة (15)
│   ├── product/      بطاقات المنتجات والمراجعات
│   ├── pharmacy/     بطاقات وخرائط الصيدليات
│   └── ui/           عناصر عامة: Reveal, ErrorBoundary, PrivateImage
├── pages/            الصفحات حسب المسار
│   ├── shop/         الرئيسية، البحث، الفئات، تتبّع الطلب
│   ├── health/       المحتوى الصحي
│   ├── account/      حساب المستخدم وتبويباته
│   └── admin/        لوحة الإدارة + tabs/
├── context/          حالات التطبيق (Auth, Router, Order…)
├── hooks/            خطافات React المخصّصة
├── lib/              منطق العمل مقسّم حسب المجال
│   ├── core/         supabase, search, format, storage…
│   ├── orders/       الطلبات، الدفع، الفواتير، الولاء
│   ├── health/       التفاعلات الدوائية، جرعات، وصفات
│   ├── location/     المسافات والاتجاهات
│   └── pharmacy/     المخزون وأقسام الصيدليات
├── i18n/             الترجمة (عربي / إنجليزي)
└── types/            تعريفات الأنواع المشتركة
```

**قاعدة الاستيراد:** استخدم دائماً `@/` للمسار الجذري (`@/components/layout/Header`)، وليس مسارات نسبية.

## النشر

- **الويب:** Vercel يبني تلقائياً من `project/` (راجع `project/vercel.json`).
- **CI:** كل push يشغّل `lint` → `typecheck` → `test` → `build`.
- **Android:** `./release.ps1`
