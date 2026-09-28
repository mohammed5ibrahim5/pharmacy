/// Translates backend errors into user-facing Arabic copy.
///
/// Screens previously surfaced `e.toString()` directly, which put payloads
/// like `AuthApiException: Invalid login credentials` or raw PostgREST/RLS
/// messages in front of end users. Anything unmatched falls back to a generic
/// message so no internal detail ever leaks; developers can still read the
/// original in the debug log.
library;

import 'package:flutter/foundation.dart';

/// Returns an Arabic message for [error].
///
/// [fallback] overrides the generic text for callers that want something
/// specific to their operation.
String friendlyError(Object error, {String fallback = 'حدث خطأ غير متوقع. حاول مرة أخرى.'}) {
  final raw = error.toString().toLowerCase();
  debugPrint('API error: $error');

  // Order matters: the most specific patterns come first.
  const table = <String, String>{
    'invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'email not confirmed': 'من فضلك أكّد بريدك الإلكتروني قبل تسجيل الدخول.',
    'user already registered': 'هذا البريد الإلكتروني مسجّل بالفعل.',
    'already registered': 'هذا البريد الإلكتروني مسجّل بالفعل.',
    'email address .* is already registered': 'هذا البريد الإلكتروني مسجّل بالفعل.',
    'weak_password': 'كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل.',
    'password should be at least': 'كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل.',
    'signup is disabled': 'التسجيل موقوف حالياً. تواصل مع الدعم.',
    'rate limit': 'محاولات كثيرة خلال وقت قصير. حاول بعد قليل.',
    'too many requests': 'محاولات كثيرة خلال وقت قصير. حاول بعد قليل.',
    'row-level security': 'ليس لديك صلاحية تنفيذ هذه العملية.',
    'permission denied': 'ليس لديك صلاحية تنفيذ هذه العملية.',
    'duplicate key value': 'البيانات مسجّلة بالفعل.',
    'could not find the function': 'تعذّر إتمام العملية. حدّث التطبيق إلى أحدث إصدار.',
    'function public.': 'تعذّر إتمام العملية. حدّث التطبيق إلى أحدث إصدار.',
    'does not exist': 'تعذّر العثور على البيانات المطلوبة.',
    'invalid input syntax': 'صيغة البيانات غير صحيحة.',
    'timeout': 'انتهت مهلة الاتصال. تحقّق من الإنترنت وحاول مرة أخرى.',
    'timed out': 'انتهت مهلة الاتصال. تحقّق من الإنترنت وحاول مرة أخرى.',
    'socketexception': 'تعذّر الاتصال بالخادم. تحقّق من اتصال الإنترنت.',
    'failed host lookup': 'تعذّر الاتصال بالخادم. تحقّق من اتصال الإنترنت.',
    'connection closed': 'انقطع الاتصال بالخادم. حاول مرة أخرى.',
    'connection reset': 'انقطع الاتصال بالخادم. حاول مرة أخرى.',
    'connection refused': 'تعذّر الوصول إلى الخادم. حاول لاحقاً.',
    'network is unreachable': 'لا يوجد اتصال بالإنترنت.',
    'no internet': 'لا يوجد اتصال بالإنترنت.',
    'clientexception': 'تعذّر الاتصال بالخادم. تحقّق من اتصال الإنترنت.',
    'unexpected socket exception': 'تعذّر الاتصال بالخادم. تحقّق من اتصال الإنترنت.',
  };

  for (final entry in table.entries) {
    if (RegExp(entry.key, caseSensitive: false).hasMatch(raw)) {
      return entry.value;
    }
  }
  return fallback;
}
