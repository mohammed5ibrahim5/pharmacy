// ============================================
// ترجمة أخطاء Supabase إلى رسائل عربية واضحة ومختصرة
// ============================================

interface TranslatedError {
  ar: string;
  hint?: string;
}

const ERROR_MAP: { pattern: RegExp; ar: string; hint?: string }[] = [
  { pattern: /email not confirmed|not confirmed/i, ar: 'البريد الإلكتروني غير مؤكد', hint: 'يرجى تفعيل حسابك من رابط التأكيد المرسل لبريدك' },
  { pattern: /invalid login credentials|invalid login|wrong password|incorrect password/i, ar: 'عذراً، بيانات الدخول غير صحيحة', hint: 'تأكد من صحة البريد الإلكتروني وكلمة المرور ثم أعد المحاولة' },
  { pattern: /user already registered|already has an account|already been registered|already registered/i, ar: 'هذا البريد مسجل بالفعل', hint: 'يمكنك تسجيل الدخول مباشرة' },
  { pattern: /rate limit|too many requests|exceeded/i, ar: 'عدد المحاولات كبير جداً', hint: 'انتظر قليلاً ثم أعد المحاولة' },
  { pattern: /password.*(less than|minimum|at least|too short|6 characters)/i, ar: 'كلمة المرور قصيرة جداً', hint: 'يجب ألا تقل عن 6 أحرف' },
  { pattern: /password.*(must|should)/i, ar: 'كلمة المرور غير مقبولة', hint: 'استخدم كلمة مرور أقوى' },
  { pattern: /invalid email|email address is invalid|not a valid email|malformed? email/i, ar: 'البريد الإلكتروني غير صحيح', hint: 'أدخل بريداً صحيحاً مثل name@example.com' },
  { pattern: /could not find the table 'public\.customers'/i, ar: 'جدول العملاء غير منشأ', hint: 'شغّل ملف setup_all.sql في Supabase SQL Editor' },
  { pattern: /could not find the table/i, ar: 'جدول في قاعدة البيانات غير منشأ', hint: 'تأكد من تشغيل ملفات الإعداد في Supabase' },
  { pattern: /network|fetch|connection|timeout|failed to fetch/i, ar: 'تعذر الاتصال بالإنترنت', hint: 'تحقق من اتصالك وأعد المحاولة' },
  { pattern: /for security purposes|email rate limit/i, ar: 'تم منع الإرسال مؤقتاً', hint: 'قم بإنشاء الحساب من متصفح آخر أو انتظر قليلاً' },
  { pattern: /user with this email/i, ar: 'لا يوجد حساب بهذا البريد', hint: 'يمكنك إنشاء حساب جديد' },
  { pattern: /phone.*already|phone.*registered|phone.*exist/i, ar: 'رقم الهاتف مسجل بالفعل', hint: 'استخدم رقماً آخر أو سجل الدخول' },
  { pattern: /duplicate key|already exists/i, ar: 'البيانات مسجلة بالفعل', hint: 'حاول ببيانات مختلفة' },
  { pattern: /permission|not allowed|forbidden|row-level security/i, ar: 'لا تملك صلاحية لهذه العملية', hint: 'تأكد من إعدادات الأمان في Supabase' },
  { pattern: /database error|internal error/i, ar: 'خطأ في قاعدة البيانات', hint: 'يرجى إعادة المحاولة' },
];

export function translateError(raw: string | null | undefined): TranslatedError {
  if (!raw) return { ar: 'حدث خطأ غير متوقع' };

  // Direct match
  for (const entry of ERROR_MAP) {
    if (entry.pattern.test(raw)) {
      return { ar: entry.ar, hint: entry.hint };
    }
  }

  // Fallback: shorten English error
  const shortened = raw.length > 80 ? raw.substring(0, 80) + '...' : raw;
  return { ar: shortened, hint: 'يرجى إعادة المحاولة' };
}

// رسائل نجاح واضحة
export const SUCCESS_MESSAGES = {
  signup: 'تم إنشاء حسابك بنجاح!',
  login: 'تم تسجيل الدخول بنجاح!',
  order: 'تم استلام طلبك بنجاح!',
  profile: 'تم تحديث بياناتك بنجاح!',
};
