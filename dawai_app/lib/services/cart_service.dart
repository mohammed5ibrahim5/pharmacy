import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/customer.dart';

class CartService {
  static const _key = 'dawai_cart';
  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<List<CartItem>> getCart() async {
    final prefs = await _prefs;
    final json = prefs.getString(_key);
    if (json == null) return [];
    final List<dynamic> list = jsonDecode(json);
    return list.map((e) => CartItem(
      key: e['key'],
      productId: e['productId'],
      pharmacyId: e['pharmacyId'],
      productName: e['productName'],
      imageUrl: e['imageUrl'],
      price: (e['price'] ?? 0).toDouble(),
      unit: e['unit'] ?? 'عبوة',
      quantity: e['quantity'] ?? 1,
      pharmacyName: e['pharmacyName'],
      requiresPrescription: e['requiresPrescription'] ?? false,
    )).toList();
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
    }).toList();
    final prefs = await _prefs;
    await prefs.setString(_key, jsonEncode(list));
  }

  Future<void> clearCart() async {
    final prefs = await _prefs;
    await prefs.remove(_key);
  }
}
