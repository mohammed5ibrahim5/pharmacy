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
}
