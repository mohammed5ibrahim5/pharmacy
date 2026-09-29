class Category {
  final String id;
  final String name;
  final String? nameEn;
  final String slug;
  final String? icon;
  final int? sortOrder;

  Category({
    required this.id,
    required this.name,
    this.nameEn,
    required this.slug,
    this.icon,
    this.sortOrder,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      nameEn: json['name_en'],
      slug: json['slug'] ?? '',
      icon: json['icon'],
      sortOrder: json['sort_order'],
    );
  }

  /// Returns a clean Arabic display name with typos/cutoffs fixed.
  String get displayName {
    final s = slug.toLowerCase();
    if (s == 'painkillers' || name.contains('مسكن') || name.contains('مسكنا')) {
      return 'مسكنات الألم';
    }
    if (s == 'antibiotics' || name.contains('مضاد') || name == 'مضادات') {
      return 'مضادات حيوية';
    }
    if (s == 'supplements' || name.contains('مكمل')) {
      return 'مكملات غذائية';
    }
    if (s == 'cold-flu' || name.contains('برد') || name.contains('إنفلونزا')) {
      return 'أدوية البرد والإنفلونزا';
    }
    if (s == 'vitamins' || name.contains('فيتامين')) {
      return 'فيتامينات ومكملات';
    }
    if (s == 'skin-care' || s == 'skincare' || name.contains('بشرة') || name.contains('العناية')) {
      return 'العناية بالبشرة';
    }
    if (s == 'baby-care' || name.contains('أطفال') || name.contains('اطفال') || name.contains('رضيع')) {
      return 'مستلزمات الأطفال';
    }
    if (s == 'digestive' || s == 'digestive-health' || name.contains('هضمي') || name.contains('معدة')) {
      return 'أدوية الجهاز الهضمي';
    }
    if (s == 'orthopedic' || s.contains('===') || name.contains('عظام') || name.contains('مفصل')) {
      return 'العظام والمفاصل';
    }
    if (s == 'mental-health' || name.contains('نفسية') || name.contains('نفسي')) {
      return 'الصحة النفسية';
    }
    if (s == 'ophthalmology' || name.contains('عين') || name.contains('عيون')) {
      return 'طب العيون';
    }
    if (s == 'general' || name.contains('عام')) {
      return 'طب عام';
    }
    // Clean up common Arabic typos and cutoffs
    var cleanName = name;
    if (cleanName.contains('مسكنا')) {
      cleanName = cleanName.replaceAll('مسكنا', 'مسكنات');
    }
    if (cleanName.contains('الالم')) {
      cleanName = cleanName.replaceAll('الالم', 'الألم');
    }
    if (cleanName.contains('الالم')) {
      cleanName = cleanName.replaceAll('الالم', 'الألم');
    }
    return cleanName.isNotEmpty ? cleanName : 'قسم عام';
  }

  /// Resolves icon identifier keys (e.g. 'pill', 'shield', 'baby') to proper medical emojis.
  String get displayIcon {
    final raw = (icon ?? '').trim().toLowerCase();

    // Map of icon names (Lucide/common keys) to emojis
    const iconMap = <String, String>{
      'pill': '💊',
      'shield': '🛡️',
      'sparkles': '✨',
      'stethoscope': '🩺',
      'heart': '❤️',
      'droplet': '💧',
      'baby': '🍼',
      'activity': '📊',
      'brain': '🧠',
      'bone': '🦴',
      'eye': '👁️',
      'thermometer': '🌡️',
      'heartpulse': '💓',
      'bandage': '🩹',
      'cross': '➕',
      'medicines': '💊',
      'cosmetics': '🧴',
      'skincare': '🧴',
      'skin-care': '💧',
      'haircare': '💇',
      'oral-care': '🪥',
      'sexual-health': '💖',
      'weight-management': '⚖️',
      'digestive-health': '🥗',
      'first-aid': '🩹',
      'home-essentials': '🏠',
      'medical-devices': '🩺',
      'herbal': '🌿',
      'vitamins': '🍊',
    };

    if (iconMap.containsKey(raw)) {
      return iconMap[raw]!;
    }

    // Fallback to slug mapping
    final s = slug.toLowerCase();
    const slugMap = <String, String>{
      'painkillers': '💊',
      'antibiotics': '🛡️',
      'supplements': '✨',
      'cold-flu': '🩺',
      'vitamins': '💓',
      'skin-care': '💧',
      'skincare': '🧴',
      'baby-care': '🍼',
      'digestive': '📊',
      'digestive-health': '🥗',
      'orthopedic': '🦴',
      'mental-health': '🧠',
      'ophthalmology': '👁️',
      'general': '🩺',
      'cosmetics': '🧴',
      'haircare': '💇',
      'oral-care': '🪥',
      'herbal': '🌿',
      'medical-devices': '🩺',
      'first-aid': '🩹',
    };

    if (slugMap.containsKey(s)) {
      return slugMap[s]!;
    }

    // If icon is already an emoji or non-ascii character
    if (raw.isNotEmpty && raw.runes.length <= 2 && raw.codeUnitAt(0) > 127) {
      return icon!;
    }

    return '💊';
  }

  // Known categories for parity with the web application
  static const List<Map<String, String>> knownCategoriesData = [
    {'slug': 'painkillers', 'name': 'مسكنات الألم', 'name_en': 'Pain Relievers', 'icon': 'pill'},
    {'slug': 'cold-flu', 'name': 'أدوية البرد والإنفلونزا', 'name_en': 'Cold & Flu', 'icon': 'stethoscope'},
    {'slug': 'antibiotics', 'name': 'مضادات حيوية', 'name_en': 'Antibiotics', 'icon': 'shield'},
    {'slug': 'vitamins', 'name': 'فيتامينات ومكملات', 'name_en': 'Vitamins', 'icon': 'heartpulse'},
    {'slug': 'supplements', 'name': 'مكملات غذائية', 'name_en': 'Supplements', 'icon': 'sparkles'},
    {'slug': 'digestive', 'name': 'أدوية الجهاز الهضمي', 'name_en': 'Digestive Health', 'icon': 'activity'},
    {'slug': 'skin-care', 'name': 'العناية بالبشرة', 'name_en': 'Skin Care', 'icon': 'droplet'},
    {'slug': 'baby-care', 'name': 'مستلزمات الأطفال', 'name_en': 'Baby Care', 'icon': 'baby'},
    {'slug': 'ophthalmology', 'name': 'طب العيون', 'name_en': 'Ophthalmology', 'icon': 'eye'},
    {'slug': 'orthopedic', 'name': 'العظام والمفاصل', 'name_en': 'Orthopedics', 'icon': 'bone'},
    {'slug': 'mental-health', 'name': 'الصحة النفسية', 'name_en': 'Mental Health', 'icon': 'brain'},
    {'slug': 'general', 'name': 'طب عام', 'name_en': 'General Medicine', 'icon': 'stethoscope'},
  ];

  static const Map<String, int> categoryPriority = {
    'painkillers': 1,
    'cold-flu': 2,
    'antibiotics': 3,
    'vitamins': 4,
    'supplements': 5,
    'digestive': 6,
    'skin-care': 7,
    'baby-care': 8,
    'ophthalmology': 9,
    'orthopedic': 10,
    'mental-health': 11,
    'general': 12,
  };

  /// Merges live DB categories with known fallback categories and orders them identically to the web app.
  static List<Category> mergeAndSort(List<Category> dbCategories) {
    // Filter out invalid/test categories
    final validDb = dbCategories.where((c) => !c.slug.contains('===') && c.name.trim().isNotEmpty).toList();

    final dbSlugs = validDb.map((c) => c.slug.toLowerCase()).toSet();
    final merged = List<Category>.from(validDb);

    for (var i = 0; i < knownCategoriesData.length; i++) {
      final k = knownCategoriesData[i];
      final slug = k['slug']!;
      if (!dbSlugs.contains(slug)) {
        merged.add(Category(
          id: 'known-$slug',
          name: k['name']!,
          nameEn: k['name_en'],
          slug: slug,
          icon: k['icon'],
          sortOrder: 1000 + i,
        ));
      }
    }

    merged.sort((a, b) {
      final pa = categoryPriority[a.slug.toLowerCase()] ?? (a.sortOrder ?? 100);
      final pb = categoryPriority[b.slug.toLowerCase()] ?? (b.sortOrder ?? 100);
      if (pa != pb) return pa.compareTo(pb);
      return a.displayName.compareTo(b.displayName);
    });

    return merged;
  }
}
