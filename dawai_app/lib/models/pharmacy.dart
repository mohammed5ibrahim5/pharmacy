class Pharmacy {
  final String id;
  final String name;
  final String? nameEn;
  final String? description;
  final String? logoUrl;
  final String? coverUrl;
  final String? phone;
  final String? whatsapp;
  final String? email;
  final String address;
  final String? area;
  final String? city;
  final double latitude;
  final double longitude;
  final bool isActive;
  final double rating;
  final bool deliveryAvailable;
  final double deliveryFee;
  final String? openingHours;
  final bool is24h;
  final bool hasParking;
  final bool acceptInsurance;
  final String? websiteUrl;
  final String? pharmacyType;
  final double? commissionRate;
  final String? subscriptionPlan;
  final DateTime createdAt;

  Pharmacy({
    required this.id,
    required this.name,
    this.nameEn,
    this.description,
    this.logoUrl,
    this.coverUrl,
    this.phone,
    this.whatsapp,
    this.email,
    required this.address,
    this.area,
    this.city,
    this.latitude = 0,
    this.longitude = 0,
    this.isActive = true,
    this.rating = 5.0,
    this.deliveryAvailable = false,
    this.deliveryFee = 0,
    this.openingHours,
    this.is24h = false,
    this.hasParking = false,
    this.acceptInsurance = false,
    this.websiteUrl,
    this.pharmacyType,
    this.commissionRate,
    this.subscriptionPlan,
    required this.createdAt,
  });

  factory Pharmacy.fromJson(Map<String, dynamic> json) {
    return Pharmacy(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      nameEn: json['name_en'],
      description: json['description'],
      logoUrl: json['logo_url'],
      coverUrl: json['cover_url'],
      phone: json['phone'],
      whatsapp: json['whatsapp'],
      email: json['email'],
      address: json['address'] ?? '',
      area: json['area'],
      city: json['city'],
      latitude: (json['latitude'] ?? 0).toDouble(),
      longitude: (json['longitude'] ?? 0).toDouble(),
      isActive: json['is_active'] ?? true,
      rating: (json['rating'] ?? 5).toDouble(),
      deliveryAvailable: json['delivery_available'] ?? false,
      deliveryFee: (json['delivery_fee'] ?? 0).toDouble(),
      openingHours: json['opening_hours'],
      is24h: json['is_24h'] ?? false,
      hasParking: json['has_parking'] ?? false,
      acceptInsurance: json['accept_insurance'] ?? false,
      websiteUrl: json['website_url'],
      pharmacyType: json['pharmacy_type'],
      commissionRate: json['commission_rate']?.toDouble(),
      subscriptionPlan: json['subscription_plan'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}
