import 'product.dart';
import 'pharmacy.dart';

class OrderGroup {
  final String id;
  final String? customerId;
  final String? address;
  final String? note;
  final String status;
  final String? paymentMethod;
  final String? paymentNumber;
  final String? paymentStatus;
  final double deliveryFee;
  final double totalPrice;
  final double loyaltyDiscount;
  final int pointsUsed;
  final double? platformCommission;
  final DateTime createdAt;
  final List<OrderItem> orders;

  OrderGroup({
    required this.id,
    this.customerId,
    this.address,
    this.note,
    this.status = 'pending',
    this.paymentMethod,
    this.paymentNumber,
    this.paymentStatus,
    this.deliveryFee = 0,
    required this.totalPrice,
    this.loyaltyDiscount = 0,
    this.pointsUsed = 0,
    this.platformCommission,
    required this.createdAt,
    this.orders = const [],
  });

  factory OrderGroup.fromJson(Map<String, dynamic> json) {
    return OrderGroup(
      id: json['id'] ?? '',
      customerId: json['customer_id'],
      address: json['address'],
      note: json['note'],
      status: json['status'] ?? 'pending',
      paymentMethod: json['payment_method'],
      paymentNumber: json['payment_number'],
      paymentStatus: json['payment_status'],
      deliveryFee: (json['delivery_fee'] ?? 0).toDouble(),
      totalPrice: (json['total_price'] ?? 0).toDouble(),
      loyaltyDiscount: (json['loyalty_discount'] ?? 0).toDouble(),
      pointsUsed: json['points_used'] ?? 0,
      platformCommission: json['platform_commission']?.toDouble(),
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      orders: (json['orders'] as List<dynamic>?)
              ?.map((e) => OrderItem.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class OrderItem {
  final String id;
  final String productId;
  final String pharmacyId;
  final int quantity;
  final double totalPrice;
  final String status;
  final String? address;
  final String? note;
  final String? paymentMethod;
  final DateTime createdAt;
  final ProductRef? product;
  final PharmacyRef? pharmacy;

  OrderItem({
    required this.id,
    required this.productId,
    required this.pharmacyId,
    this.quantity = 1,
    required this.totalPrice,
    this.status = 'pending',
    this.address,
    this.note,
    this.paymentMethod,
    required this.createdAt,
    this.product,
    this.pharmacy,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? '',
      productId: json['product_id'] ?? '',
      pharmacyId: json['pharmacy_id'] ?? '',
      quantity: json['quantity'] ?? 1,
      totalPrice: (json['total_price'] ?? 0).toDouble(),
      status: json['status'] ?? 'pending',
      address: json['address'],
      note: json['note'],
      paymentMethod: json['payment_method'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      product: json['product'] != null ? ProductRef.fromJson(json['product']) : null,
      pharmacy: json['pharmacy'] != null ? PharmacyRef.fromJson(json['pharmacy']) : null,
    );
  }
}
