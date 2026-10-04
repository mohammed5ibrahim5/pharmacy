import '../../models/category.dart';
import '../../providers/language_provider.dart';

String localizedCategoryName(Category category, LanguageProvider language) {
  final key = 'category_name_${category.slug.toLowerCase().replaceAll('-', '_')}';
  final translated = language.t(key);
  if (translated != key) return translated;
  if (language.isArabic) return category.displayName;

  final nameEn = category.nameEn?.trim();
  if (nameEn != null && nameEn.isNotEmpty) return nameEn;

  return category.slug
      .split(RegExp(r'[-_]'))
      .where((part) => part.isNotEmpty)
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}
