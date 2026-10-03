import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/customer.dart';

class CartService {
  static const _key = 'dawai_cart_v2';
  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<List<CartItem>> getCart() async {
    final prefs = await _prefs;
    final json = prefs.getString(_key) ?? prefs.getString('dawai_cart');
    if (json == null) return [];
    try {
      final List<dynamic> list = jsonDecode(json);
      return list.map((e) => CartItem(
        key: e['key'] ?? '${e['productId']}:${e['pharmacyId']}',
        productId: e['productId'] ?? '',
        pharmacyId: e['pharmacyId'] ?? '',
        productName: e['productName'] ?? '',
        imageUrl: e['imageUrl'],
        price: (e['price'] ?? 0).toDouble(),
        unit: e['unit'] ?? 'عبوة',
        quantity: e['quantity'] ?? 1,
        pharmacyName: e['pharmacyName'],
        requiresPrescription: e['requiresPrescription'] ?? false,
        deliveryFee: e['deliveryFee']?.toDouble(),
        deliveryAvailable: e['deliveryAvailable'],
        forAllPharmacies: e['forAllPharmacies'] ?? false,
        isAvailable: e['isAvailable'] ?? true,
        stockQuantity: e['stockQuantity'] ?? 0,
      )).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> saveCart(List<CartItem> items) async {
    final list = items.map((e) => {
      'key': e.key,
      'productId': e.productId,
      'pharmacyId': e.pharmacyId,
      'productName': e.productName,
      'imageUrl': e.imageUrl,
      'price': e.price,
      'unit': e.unit,
      'quantity': e.quantity,
      'pharmacyName': e.pharmacyName,
      'requiresPrescription': e.requiresPrescription,
      'deliveryFee': e.deliveryFee,
      'deliveryAvailable': e.deliveryAvailable,
      'forAllPharmacies': e.forAllPharmacies,
      'isAvailable': e.isAvailable,
      'stockQuantity': e.stockQuantity,
    }).toList();
    final prefs = await _prefs;
    await prefs.setString(_key, jsonEncode(list));
    await prefs.remove('dawai_cart');
  }

  Future<void> clearCart() async {
    final prefs = await _prefs;
    await prefs.remove(_key);
    await prefs.remove('dawai_cart');
  }
}
