import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/core/utils/category_localization.dart';
import 'package:dawai_app/models/category.dart';
import 'package:dawai_app/providers/language_provider.dart';

void main() {
  group('localizedCategoryName', () {
    test('uses the locale-specific label for known categories', () async {
      final language = LanguageProvider();
      await language.setLanguage('en');
      final category = Category(
        id: 'known-painkillers',
        name: 'مسكنات الألم',
        nameEn: 'Pain Relievers',
        slug: 'painkillers',
      );

      expect(localizedCategoryName(category, language), 'Pain Relievers');
    });

    test('humanizes unknown slugs in English when there is no English name', () async {
      final language = LanguageProvider();
      await language.setLanguage('en');
      final category = Category(
        id: 'custom',
        name: 'فئة مخصصة',
        slug: 'custom-category',
      );

      expect(localizedCategoryName(category, language), 'Custom Category');
    });
  });
}
