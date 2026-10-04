import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/core/utils/api_error.dart';
import 'package:dawai_app/i18n/ar.dart';
import 'package:dawai_app/i18n/en.dart';

void main() {
  group('friendlyError localization', () {
    test('uses English translations for recognized backend errors', () {
      final message = friendlyError(
        Exception('Invalid login credentials'),
        translate: (key) => enTranslations[key] ?? key,
      );

      expect(message, enTranslations['api_error_invalid_login']);
    });

    test('preserves the Arabic copy for recognized backend errors', () {
      final message = friendlyError(
        Exception('Invalid login credentials'),
        translate: (key) => arTranslations[key] ?? key,
      );

      expect(message, arTranslations['api_error_invalid_login']);
    });

    test('uses the caller locale for unrecognized errors', () {
      const fallback = 'Could not sign in. Please try again.';
      final message = friendlyError(
        Exception('unmapped backend error'),
        fallback: fallback,
        translate: (key) => enTranslations[key] ?? key,
      );

      expect(message, fallback);
    });
  });
}
