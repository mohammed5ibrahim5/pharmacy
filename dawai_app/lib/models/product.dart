class Product {
  final String id;
  final String pharmacyId;
  final String? categoryId;
  final String name;
  final String? nameEn;
  final String? description;
  final String? imageUrl;
  final double price;
  final String unit;
  final bool isAvailable;
  final bool requiresPrescription;
  final String? activeIngredient;
  final String? manufacturer;
  final String? form;
  final String? dosage;
  final String? howToUse;
  final String? contraindications;
  final String? interactions;
  final int stockQuantity;
  final String? barcode;
  final bool forAllPharmacies;
  final DateTime createdAt;
  final PharmacyRef? pharmacy;
  final CategoryRef? category;

  Product({
    required this.id,
    required this.pharmacyId,
    this.categoryId,
    required this.name,
    this.nameEn,
    this.description,
    this.imageUrl,
    required this.price,
    this.unit = 'عبوة',
    this.isAvailable = true,
    this.requiresPrescription = false,
    this.activeIngredient,
    this.manufacturer,
    this.form,
    this.dosage,
    this.howToUse,
    this.contraindications,
    this.interactions,
    this.stockQuantity = 0,
    this.barcode,
    this.forAllPharmacies = false,
    required this.createdAt,
    this.pharmacy,
    this.category,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      pharmacyId: json['pharmacy_id'] ?? '',
      categoryId: json['category_id'],
      name: json['name'] ?? '',
      nameEn: json['name_en'],
      description: json['description'],
      imageUrl: json['image_url'],
      price: (json['price'] ?? 0).toDouble(),
      unit: json['unit'] ?? 'عبوة',
      isAvailable: json['is_available'] ?? true,
      requiresPrescription: json['requires_prescription'] ?? false,
      activeIngredient: json['active_ingredient'],
      manufacturer: json['manufacturer'],
      form: json['form'],
      dosage: json['dosage'],
      howToUse: json['how_to_use'],
      contraindications: json['contraindications'],
      interactions: json['interactions'],
      stockQuantity: json['stock_quantity'] ?? 0,
      barcode: json['barcode'],
      forAllPharmacies: json['for_all_pharmacies'] ?? false,
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      pharmacy: json['pharmacy'] != null ? PharmacyRef.fromJson(json['pharmacy']) : null,
      category: json['category'] != null ? CategoryRef.fromJson(json['category']) : null,
    );
  }
}

class PharmacyRef {
  final String id;
  final String name;
  final String? logoUrl;
  final double? deliveryFee;
  final bool? deliveryAvailable;

  PharmacyRef({
    required this.id,
    required this.name,
    this.logoUrl,
    this.deliveryFee,
    this.deliveryAvailable,
  });

  factory PharmacyRef.fromJson(Map<String, dynamic> json) {
    return PharmacyRef(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      logoUrl: json['logo_url'],
      deliveryFee: json['delivery_fee']?.toDouble(),
      deliveryAvailable: json['delivery_available'],
    );
  }
}

class ProductRef {
  final String id;
  final String name;
  final String? imageUrl;
  final String? unit;

  ProductRef({
    required this.id,
    required this.name,
    this.imageUrl,
    this.unit,
  });

  factory ProductRef.fromJson(Map<String, dynamic> json) {
    return ProductRef(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      imageUrl: json['image_url'],
      unit: json['unit'],
    );
  }
}

class CategoryRef {
  final String id;
  final String name;
  final String? slug;
  final String? icon;

  CategoryRef({
    required this.id,
    required this.name,
    this.slug,
    this.icon,
  });

  factory CategoryRef.fromJson(Map<String, dynamic> json) {
    return CategoryRef(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'],
      icon: json['icon'],
    );
  }
}
