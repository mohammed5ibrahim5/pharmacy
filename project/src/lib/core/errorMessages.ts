// ============================================
// ترجمة أخطاء Supabase إلى رسائل عربية وإنجليزية واضحة ومختصرة
// ============================================

export interface TranslatedError {
  ar: string;
  en: string;
  hint?: string;
  hintEn?: string;
}

const ERROR_MAP: { pattern: RegExp; ar: string; en: string; hint?: string; hintEn?: string }[] = [
  {
    pattern: /email not confirmed|not confirmed/i,
    ar: 'البريد الإلكتروني غير مؤكد',
    en: 'Email not confirmed',
    hint: 'يرجى تفعيل حسابك من رابط التأكيد المرسل لبريدك',
    hintEn: 'Please verify your account from the confirmation link sent to your email',
  },
  {
    pattern: /invalid login credentials|invalid login|wrong password|incorrect password/i,
    ar: 'عذراً، بيانات الدخول غير صحيحة',
    en: 'Invalid login credentials',
    hint: 'تأكد من صحة البريد الإلكتروني وكلمة المرور ثم أعد المحاولة',
    hintEn: 'Check your email and password, then try again',
  },
  {
    pattern: /user already registered|already has an account|already been registered|already registered/i,
    ar: 'هذا البريد مسجل بالفعل',
    en: 'Email already registered',
    hint: 'يمكنك تسجيل الدخول مباشرة',
    hintEn: 'You can sign in directly',
  },
  {
    pattern: /rate limit|too many requests|exceeded/i,
    ar: 'عدد المحاولات كبير جداً',
    en: 'Too many attempts',
    hint: 'انتظر قليلاً ثم أعد المحاولة',
    hintEn: 'Please wait a moment and try again',
  },
  {
    pattern: /password.*(less than|minimum|at least|too short|6 characters)/i,
    ar: 'كلمة المرور قصيرة جداً',
    en: 'Password is too short',
    hint: 'يجب ألا تقل عن 6 أحرف',
    hintEn: 'Must be at least 6 characters',
  },
  {
    pattern: /password.*(must|should)/i,
    ar: 'كلمة المرور غير مقبولة',
    en: 'Password not accepted',
    hint: 'استخدم كلمة مرور أقوى',
    hintEn: 'Please use a stronger password',
  },
  {
    pattern: /invalid email|email address is invalid|not a valid email|malformed? email/i,
    ar: 'البريد الإلكتروني غير صحيح',
    en: 'Invalid email address',
    hint: 'أدخل بريداً صحيحاً مثل name@example.com',
    hintEn: 'Enter a valid email like name@example.com',
  },
  {
    pattern: /could not find the table 'public\.customers'/i,
    ar: 'جدول العملاء غير منشأ',
    en: 'Customers table is missing',
    hint: 'شغّل ملف setup_all.sql في Supabase SQL Editor',
    hintEn: 'Run setup_all.sql in Supabase SQL Editor',
  },
  {
    pattern: /could not find the table/i,
    ar: 'جدول في قاعدة البيانات غير منشأ',
    en: 'A database table is missing',
    hint: 'تأكد من تشغيل ملفات الإعداد في Supabase',
    hintEn: 'Make sure the setup files are run in Supabase',
  },
  {
    pattern: /network|fetch|connection|timeout|failed to fetch/i,
    ar: 'تعذر الاتصال بالإنترنت',
    en: 'Could not connect to the internet',
    hint: 'تحقق من اتصالك وأعد المحاولة',
    hintEn: 'Check your connection and try again',
  },
  {
    pattern: /for security purposes|email rate limit/i,
    ar: 'تم منع الإرسال مؤقتاً',
    en: 'Sending is temporarily blocked',
    hint: 'قم بإنشاء الحساب من متصفح آخر أو انتظر قليلاً',
    hintEn: 'Try another browser or wait a moment',
  },
  {
    pattern: /user with this email/i,
    ar: 'لا يوجد حساب بهذا البريد',
    en: 'No account with this email',
    hint: 'يمكنك إنشاء حساب جديد',
    hintEn: 'You can create a new account',
  },
  {
    pattern: /phone.*already|phone.*registered|phone.*exist/i,
    ar: 'رقم الهاتف مسجل بالفعل',
    en: 'Phone number already registered',
    hint: 'استخدم رقماً آخر أو سجل الدخول',
    hintEn: 'Use another number or sign in',
  },
  {
    pattern: /PHONE_INVALID/i,
    ar: 'يرجى إدخال رقم هاتف مصري صحيح (11 رقماً يبدأ بـ 01)',
    en: 'Please enter a valid Egyptian mobile number (11 digits starting with 01)',
    hint: 'مثال: 01012345678',
    hintEn: 'Example: 01012345678',
  },
  {
    pattern: /duplicate key|already exists/i,
    ar: 'البيانات مسجلة بالفعل',
    en: 'This data is already saved',
    hint: 'حاول ببيانات مختلفة',
    hintEn: 'Try with different data',
  },
  {
    pattern: /permission|not allowed|forbidden|row-level security/i,
    ar: 'لا تملك صلاحية لهذه العملية',
    en: 'You do not have permission for this action',
    hint: 'تأكد من إعدادات الأمان في Supabase',
    hintEn: 'Check the security settings in Supabase',
  },
  {
    pattern: /database error|internal error/i,
    ar: 'خطأ في قاعدة البيانات',
    en: 'Database error',
    hint: 'يرجى إعادة المحاولة',
    hintEn: 'Please try again',
  },
  {
    pattern: /^لا يوجد حساب بهذا البريد الإلكتروني$/,
    ar: 'لا يوجد حساب بهذا البريد الإلكتروني',
    en: 'No account found with this email',
    hint: 'يمكنك إنشاء حساب جديد',
    hintEn: 'You can create a new account',
  },
  {
    pattern: /^هذا الحساب لا يدعم تسجيل الدخول المباشر$/,
    ar: 'هذا الحساب لا يدعم تسجيل الدخول المباشر',
    en: 'This account does not support direct login',
  },
  {
    pattern: /^كلمة المرور غير صحيحة$/,
    ar: 'كلمة المرور غير صحيحة',
    en: 'Incorrect password',
    hint: 'تأكد من كلمة المرور ثم أعد المحاولة',
    hintEn: 'Check your password and try again',
  },
  {
    pattern: /^هذا البريد الإلكتروني مسجل بالفعل، برجاء تسجيل الدخول$/,
    ar: 'هذا البريد الإلكتروني مسجل بالفعل، برجاء تسجيل الدخول',
    en: 'This email is already registered. Please log in',
  },
  {
    pattern: /^غير مسجل دخول$/,
    ar: 'غير مسجل دخول',
    en: 'You are not signed in',
  },
  {
    pattern: /invalid input syntax for type uuid|invalid text representation|invalid input syntax/i,
    ar: 'معرّف الحساب غير صالح',
    en: 'Invalid account identifier',
    hint: 'سجل دخولك من جديد ثم أعد المحاولة',
    hintEn: 'Sign in again and retry',
  },
  {
    pattern: /violates foreign key constraint|is still referenced from table/i,
    ar: 'لا يمكن إتمام هذه العملية',
    en: 'This action cannot be completed',
    hint: 'البيانات مرتبطة بطلبات أو سجلات أخرى',
    hintEn: 'This data is linked to other records',
  },
  {
    pattern: /violates unique constraint|duplicate key value/i,
    ar: 'القيمة مسجلة بالفعل',
    en: 'This value is already saved',
    hint: 'استخدم قيمة أخرى',
    hintEn: 'Please use a different value',
  },
  {
    pattern: /column .* does not exist|relation .* does not exist|could not find the/,
    ar: 'قاعدة البيانات بحاجة للتحديث',
    en: 'The database needs to be updated',
    hint: 'شغّل ملفات الإعداد المحدثة في Supabase SQL Editor',
    hintEn: 'Run the latest setup SQL files in Supabase',
  },
  {
    pattern: /null value in column|not-null constraint/i,
    ar: 'بعض البيانات المطلوبة لم تُرسل',
    en: 'Some required fields are missing',
    hint: 'يرجى تعبئة جميع الحقول المطلوبة',
    hintEn: 'Please fill in all required fields',
  },
  {
    pattern: /syntax error|cannot be cast|invalid object name|syntax_error/i,
    ar: 'صيغة البيانات المُرسلة غير صحيحة',
    en: 'Invalid data format',
    hint: 'يرجى تحديث الصفحة وإعادة المحاولة',
    hintEn: 'Refresh the page and try again',
  },
  {
    pattern: /anonymous sign-i?ns?|anonymous.*(disabled|not enabled|enabled)|sign.*anonymous/i,
    ar: 'التسجيل التجريبي غير مفعّل على الخادم',
    en: 'Anonymous sign-in is not enabled',
    hint: 'فعّل "Anonymous sign-ins" من إعدادات Supabase Auth ثم أعد المحاولة',
    hintEn: 'Enable "Anonymous sign-ins" in Supabase Auth settings, then retry',
  },
  {
    pattern: /an? (valid )?otp|otp expired|invalid token|invalid otp/i,
    ar: 'كود التحقق غير صالح أو منتهي',
    en: 'Invalid or expired verification code',
    hint: 'اطلب كوداً جديداً وأدخله خلال الوقت المحدد',
    hintEn: 'Request a new code and enter it in time',
  },
  {
    pattern: /token has expired|jwt.*expired|refresh token/i,
    ar: 'انتهت صلاحية الجلسة',
    en: 'Session expired',
    hint: 'سجل دخولك من جديد',
    hintEn: 'Please sign in again',
  },
  {
    pattern: /signups? disabled|new users.*disabled|signup.*not.*enabled/i,
    ar: 'إنشاء الحسابات الجديدة معطّل حالياً',
    en: 'New signups are currently disabled',
    hint: 'حاول لاحقاً أو تواصل مع الدعم',
    hintEn: 'Try again later or contact support',
  },
  {
    pattern: /failed to parse|invalid json|unexpected end of json|invalid character/i,
    ar: 'استجابة غير صالحة من الخادم',
    en: 'Invalid server response',
    hint: 'يرجى تحديث الصفحة وإعادة المحاولة',
    hintEn: 'Refresh the page and try again',
  },
];

export function translateError(raw: string | null | undefined): TranslatedError {
  if (!raw) return { ar: 'حدث خطأ غير متوقع', en: 'Unexpected error' };

  const trimmed = raw.trim();
  // أي رسالة عربية ناتجة من التطبيق نفسه تُعرض كما هي بدون محاولة ترجمتها
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return { ar: trimmed, en: trimmed };
  }

  // Direct match
  for (const entry of ERROR_MAP) {
    if (entry.pattern.test(raw)) {
      return { ar: entry.ar, en: entry.en, hint: entry.hint, hintEn: entry.hintEn };
    }
  }

  // Friendly fallback — أبداً لا نعرض نص الخطأ التقني الخام للمستخدم
  console.warn('[unhandled error]', raw);
  return {
    ar: 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى',
    en: 'An unexpected error occurred, please try again',
    hint: 'إذا تكررت المشكلة قم بتحديث الصفحة',
    hintEn: 'If the problem persists, refresh the page',
  };
}

export function localizedError(raw: string | null | undefined, lang: 'ar' | 'en'): string {
  const t = translateError(raw);
  return lang === 'en' ? t.en : t.ar;
}

// رسائل نجاح واضحة
export const SUCCESS_MESSAGES = {
  signup: { ar: 'تم إنشاء حسابك بنجاح!', en: 'Your account has been created successfully!' },
  login: { ar: 'تم تسجيل الدخول بنجاح!', en: 'You have signed in successfully!' },
  order: { ar: 'تم استلام طلبك بنجاح!', en: 'Your order has been received successfully!' },
  profile: { ar: 'تم تحديث بياناتك بنجاح!', en: 'Your profile has been updated successfully!' },
};
