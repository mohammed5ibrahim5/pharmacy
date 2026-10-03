class SearchIntent {
  const SearchIntent({
    required this.categorySlugs,
    required this.fuzzyTerms,
    required this.isSymptomSearch,
    required this.terms,
  });

  final List<String> categorySlugs;
  final List<String> fuzzyTerms;
  final bool isSymptomSearch;
  final List<String> terms;
}

const _stopWords = {
  'عايز',
  'عاوزه',
  'اريد',
  'ابحث',
  'عن',
  'في',
  'من',
  'الى',
  'لي',
  'لل',
  'ال',
  'دواء',
  'ادويه',
  'دواءا',
  'the',
  'for',
  'a',
  'an',
  'i',
  'need',
  'want',
  'medicine',
  'drug',
};

const _intents =
    <({List<String> aliases, String category, List<String> terms})>[
      (
        aliases: [
          'صداع',
          'صداع نصفي',
          'وجع الراس',
          'وجع الرأس',
          'مسكن',
          'مسكنات',
          'headache',
          'migraine',
          'painkiller',
          'analgesic',
        ],
        category: 'painkillers',
        terms: ['صداع', 'headache', 'مسكن'],
      ),
      (
        aliases: [
          'برد',
          'زكام',
          'رشح',
          'انفلونزا',
          'إنفلونزا',
          'احتقان',
          'cold',
          'flu',
          'cough',
          'سعال',
          'كحة',
        ],
        category: 'cold-flu',
        terms: ['برد', 'زكام', 'cold', 'flu', 'سعال', 'كحة'],
      ),
      (
        aliases: [
          'معده',
          'معدة',
          'الم البطن',
          'ألم البطن',
          'حموضه',
          'حموضة',
          'هضم',
          'stomach',
          'digestion',
          'heartburn',
        ],
        category: 'digestive',
        terms: ['معدة', 'هضم', 'stomach', 'heartburn'],
      ),
    ];

String normalizeSearchText(String value) {
  return value
      .toLowerCase()
      .replaceAll(RegExp(r'[\u0610-\u061A\u064B-\u065F\u0670\u0640]'), '')
      .replaceAllMapped(RegExp(r'[\u0660-\u0669]'), (match) {
        return String.fromCharCode(
          match.group(0)!.codeUnitAt(0) - 0x0660 + 0x30,
        );
      })
      .replaceAllMapped(RegExp(r'[\u06F0-\u06F9]'), (match) {
        return String.fromCharCode(
          match.group(0)!.codeUnitAt(0) - 0x06F0 + 0x30,
        );
      })
      .replaceAll(RegExp(r'[أإآٱ]'), 'ا')
      .replaceAll('ة', 'ه')
      .replaceAll('ى', 'ي')
      .replaceAll('ی', 'ي')
      .replaceAll('ک', 'ك')
      .replaceAll(RegExp(r'[^a-z0-9\u0600-\u06FF\s]'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

String _normalizeArabicPrefix(String token) {
  for (final prefix in const [
    'وال',
    'بال',
    'كال',
    'لل',
    'ال',
    'و',
    'ف',
    'ب',
    'ل',
    'ك',
  ]) {
    if (token.startsWith(prefix) && token.length - prefix.length >= 3) {
      return token.substring(prefix.length);
    }
  }
  return token;
}

int levenshteinDistance(String a, String b) {
  if (a.isEmpty) return b.length;
  if (b.isEmpty) return a.length;

  var previous = List<int>.generate(b.length + 1, (index) => index);
  for (var i = 1; i <= a.length; i++) {
    final current = List<int>.filled(b.length + 1, 0)..[0] = i;
    for (var j = 1; j <= b.length; j++) {
      final substitutionCost = a[i - 1] == b[j - 1] ? 0 : 1;
      current[j] = [
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      ].reduce((x, y) => x < y ? x : y);
    }
    previous = current;
  }
  return previous[b.length];
}

List<String> _typoVariants(String token) {
  if (token.length < 5 || token.length > 18) return const [];

  final variants = <String>{};
  for (var i = 0; i <= token.length; i++) {
    variants.add(token.replaceRange(i, i, '_'));
  }
  for (var i = 0; i < token.length; i++) {
    variants.add(token.replaceRange(i, i + 1, ''));
    variants.add(token.replaceRange(i, i + 1, '_'));
  }
  for (var i = 0; i + 1 < token.length; i++) {
    variants.add(
      token.substring(0, i) + token[i + 1] + token[i] + token.substring(i + 2),
    );
  }
  variants.removeWhere((variant) => variant.length < 4);
  return variants.toList();
}

SearchIntent analyzeSearchIntent(String query) {
  final normalized = normalizeSearchText(query);
  final rawTokens = normalized
      .split(' ')
      .map(_normalizeArabicPrefix)
      .where((token) => token.length >= 2 && !_stopWords.contains(token))
      .toList();

  final terms = <String>{...rawTokens};
  final enteredTokens = query
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9\u0600-\u06FF\s]'), ' ')
      .split(RegExp(r'\s+'));
  for (final entered in enteredTokens) {
    final raw = _normalizeArabicPrefix(entered);
    final canonical = _normalizeArabicPrefix(normalizeSearchText(entered));
    if (canonical.length < 2 || _stopWords.contains(canonical)) continue;
    terms
      ..add(raw)
      ..add(canonical);
  }

  final categorySlugs = <String>{};
  var isSymptomSearch = false;

  for (final intent in _intents) {
    final matched = intent.aliases.any(
      (alias) => normalized.contains(normalizeSearchText(alias)),
    );
    if (!matched) continue;
    isSymptomSearch = true;
    categorySlugs.add(intent.category);
    terms.addAll(intent.terms);
  }

  final typoToken = rawTokens
      .where(
        (token) =>
            RegExp(r'[a-z]').hasMatch(token) ||
            token.runes.any((rune) => rune >= 0x0621 && rune <= 0x064A),
      )
      .fold<String?>(
        null,
        (longest, token) =>
            longest == null || token.length > longest.length ? token : longest,
      );

  return SearchIntent(
    categorySlugs: categorySlugs.toList(),
    fuzzyTerms: typoToken == null ? const [] : _typoVariants(typoToken),
    isSymptomSearch: isSymptomSearch,
    terms: terms.toList(),
  );
}
