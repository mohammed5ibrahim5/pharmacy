/// Translates backend errors into user-facing localized copy.
///
/// Screens previously surfaced `e.toString()` directly, which put payloads
/// like `AuthApiException: Invalid login credentials` or raw PostgREST/RLS
/// messages in front of end users. Anything unmatched falls back to a generic
/// message so no internal detail ever leaks; developers can still read the
/// original in the debug log.
library;

import 'package:flutter/foundation.dart';
import '../../i18n/ar.dart';

/// Returns a localized message for [error].
///
/// [fallback] overrides the generic text for callers that want something
/// specific to their operation. Arabic is used when [translate] is omitted.
String friendlyError(
  Object error, {
  String fallback = 'حدث خطأ غير متوقع. حاول مرة أخرى.',
  String Function(String key)? translate,
}) {
  final raw = error.toString().toLowerCase();
  debugPrint('API error: $error');

  // Order matters: the most specific patterns come first.
  const table = <String, String>{
    'invalid login credentials': 'api_error_invalid_login',
    'email not confirmed': 'api_error_email_unconfirmed',
    'user already registered': 'api_error_already_registered',
    'already registered': 'api_error_already_registered',
    'email address .* is already registered': 'api_error_already_registered',
    'weak_password': 'api_error_weak_password',
    'password should be at least': 'api_error_weak_password',
    'signup is disabled': 'api_error_signup_disabled',
    'rate limit': 'api_error_rate_limited',
    'too many requests': 'api_error_rate_limited',
    'row-level security': 'api_error_permission_denied',
    'permission denied': 'api_error_permission_denied',
    'duplicate key value': 'api_error_duplicate',
    'could not find the function': 'api_error_update_required',
    'function public.': 'api_error_update_required',
    'does not exist': 'api_error_not_found',
    'invalid input syntax': 'api_error_invalid_data',
    'timeout': 'api_error_timeout',
    'timed out': 'api_error_timeout',
    'socketexception': 'api_error_connection_failed',
    'failed host lookup': 'api_error_connection_failed',
    'connection closed': 'api_error_connection_lost',
    'connection reset': 'api_error_connection_lost',
    'connection refused': 'api_error_server_unavailable',
    'network is unreachable': 'api_error_no_internet',
    'no internet': 'api_error_no_internet',
    'clientexception': 'api_error_connection_failed',
    'unexpected socket exception': 'api_error_connection_failed',
  };

  for (final entry in table.entries) {
    if (RegExp(entry.key, caseSensitive: false).hasMatch(raw)) {
      final key = entry.value;
      return translate?.call(key) ?? arTranslations[key] ?? fallback;
    }
  }
  return fallback;
}
