import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/core/utils/smart_product_search.dart';

void main() {
  group('normalizeSearchText', () {
    test('normalizes Arabic spelling variations and diacritics', () {
      expect(normalizeSearchText('إِنْفِلُونْزَا'), 'انفلونزا');
      expect(normalizeSearchText('صيدليةٌ'), 'صيدليه');
      expect(normalizeSearchText('بانادول ٥٠٠'), 'بانادول 500');
      expect(normalizeSearchText('کاتب ی'), 'كاتب ي');
    });
  });

  group('analyzeSearchIntent', () {
    test('maps an Arabic headache request to pain relievers', () {
      final intent = analyzeSearchIntent('عايز مسكن للصداع');

      expect(intent.categorySlugs, contains('painkillers'));
      expect(intent.isSymptomSearch, isTrue);
      expect(intent.terms, containsAll(['مسكن', 'صداع', 'headache']));
    });

    test('maps cold symptoms to cold and flu products', () {
      final intent = analyzeSearchIntent('دواء للزكام والكحة');

      expect(intent.categorySlugs, contains('cold-flu'));
      expect(intent.isSymptomSearch, isTrue);
    });

    test('keeps barcode-like numeric searches intact', () {
      final intent = analyzeSearchIntent('1234567890123');

      expect(intent.terms, contains('1234567890123'));
      expect(intent.categorySlugs, isEmpty);
      expect(intent.isSymptomSearch, isFalse);
    });

    test('does not produce a blank search for filler words', () {
      expect(analyzeSearchIntent('عايز دواء').terms, isEmpty);
    });

    test('generates typo variants for a misspelled brand name', () {
      final intent = analyzeSearchIntent('panadoll');

      expect(intent.fuzzyTerms, contains('panadol'));
      expect(analyzeSearchIntent('panadxl').fuzzyTerms, contains('panad_l'));
    });
  });

  group('levenshteinDistance', () {
    test('counts a single substitution', () {
      expect(levenshteinDistance('panadol', 'panadol'), 0);
      expect(levenshteinDistance('panadol', 'panadxl'), 1);
    });
  });
}
