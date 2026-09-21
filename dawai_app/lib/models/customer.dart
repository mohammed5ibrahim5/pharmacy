class Customer {
  final String id;
  final String? userId;
  final String? fullName;
  final String? phone;
  final String email;
  final String? avatarUrl;
  final int loyaltyPoints;
  final DateTime createdAt;

  Customer({
    required this.id,
    this.userId,
    this.fullName,
    this.phone,
    required this.email,
    this.avatarUrl,
    this.loyaltyPoints = 0,
    required this.createdAt,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] ?? '',
      userId: json['user_id'],
      fullName: json['full_name'],
      phone: json['phone'],
      email: json['email'] ?? '',
      avatarUrl: json['avatar_url'],
      loyaltyPoints: json['loyalty_points'] ?? 0,
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

class Review {
  final String id;
  final String pharmacyId;
  final String? customerId;
  final String customerName;
  final double rating;
  final String? comment;
  final DateTime createdAt;

  Review({
    required this.id,
    required this.pharmacyId,
    this.customerId,
    required this.customerName,
    required this.rating,
    this.comment,
    required this.createdAt,
  });

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] ?? '',
      pharmacyId: json['pharmacy_id'] ?? '',
      customerId: json['customer_id'],
      customerName: json['customer_name'] ?? 'عميل',
      rating: (json['rating'] ?? 5).toDouble(),
      comment: json['comment'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

class CartItem {
  final String key;
  final String productId;
  final String pharmacyId;
  final String productName;
  final String? imageUrl;
  final double price;
  final String unit;
  int quantity;
  final String? pharmacyName;
  final bool requiresPrescription;
  final double? deliveryFee;

  CartItem({
    required this.key,
    required this.productId,
    required this.pharmacyId,
    required this.productName,
    this.imageUrl,
    required this.price,
    this.unit = 'عبوة',
    this.quantity = 1,
    this.pharmacyName,
    this.requiresPrescription = false,
    this.deliveryFee,
  });

  double get totalPrice => price * quantity;
}

class SiteSettings {
  final String siteName;
  final String? siteNameEn;
  final String siteTagline;
  final String? logoUrl;
  final String primaryColor;
  final String secondaryColor;
  final String accentColor;
  final String? contactPhone;
  final String? contactWhatsapp;
  final String? heroTitle;
  final String? heroSubtitle;
  final bool announcementActive;
  final String? announcementText;

  SiteSettings({
    this.siteName = 'صيدليتي',
    this.siteNameEn,
    this.siteTagline = 'صيدلياتك القريبة منك في مكان واحد',
    this.logoUrl,
    this.primaryColor = '#0d9488',
    this.secondaryColor = '#0f766e',
    this.accentColor = '#f59e0b',
    this.contactPhone,
    this.contactWhatsapp,
    this.heroTitle,
    this.heroSubtitle,
    this.announcementActive = false,
    this.announcementText,
  });

  factory SiteSettings.fromJson(Map<String, dynamic> json) {
    return SiteSettings(
      siteName: json['site_name'] ?? 'صيدليتي',
      siteNameEn: json['site_name_en'],
      siteTagline: json['site_tagline'] ?? '',
      logoUrl: json['logo_url'],
      primaryColor: json['primary_color'] ?? '#0d9488',
      secondaryColor: json['secondary_color'] ?? '#0f766e',
      accentColor: json['accent_color'] ?? '#f59e0b',
      contactPhone: json['contact_phone'],
      contactWhatsapp: json['contact_whatsapp'],
      heroTitle: json['hero_title'],
      heroSubtitle: json['hero_subtitle'],
      announcementActive: json['announcement_active'] ?? false,
      announcementText: json['announcement_text'],
    );
  }
}
