import 'package:flutter/material.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../services/cart_service.dart';
import '../services/favorites_service.dart';

class AppState extends ChangeNotifier {
  final ApiService api = ApiService();
  final CartService _cartService = CartService();
  final FavoritesService _favoritesService = FavoritesService();

  List<CartItem> _cart = [];
  List<CartItem> get cart => _cart;

  List<String> _favoriteIds = [];
  List<String> get favoriteIds => _favoriteIds;

  int get cartCount => _cart.fold(0, (sum, item) => sum + item.quantity);
  double get cartTotal => _cart.fold(0, (sum, item) => sum + item.totalPrice);

  bool get isLoggedIn => api.currentUser != null;

  void loadCart() async {
    _cart = await _cartService.getCart();
    notifyListeners();
  }

  void loadFavorites() async {
    _favoriteIds = await _favoritesService.getFavorites();
    notifyListeners();
  }

  bool isFavorite(String productId) => _favoriteIds.contains(productId);

  void toggleFavorite(String productId) async {
    await _favoritesService.toggleFavorite(productId);
    if (_favoriteIds.contains(productId)) {
      _favoriteIds.remove(productId);
    } else {
      _favoriteIds.add(productId);
    }
    notifyListeners();
  }

  void addToCart(Product product, {String? pharmacyName}) {
    final key = '${product.id}:${product.pharmacyId}';
    final existing = _cart.indexWhere((e) => e.key == key);
    if (existing >= 0) {
      _cart[existing].quantity++;
    } else {
      _cart.add(CartItem(
        key: key,
        productId: product.id,
        pharmacyId: product.pharmacyId,
        productName: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        unit: product.unit,
        quantity: 1,
        pharmacyName: pharmacyName ?? product.pharmacy?.name,
        requiresPrescription: product.requiresPrescription,
        deliveryFee: product.pharmacy?.deliveryFee,
      ));
    }
    _cartService.saveCart(_cart);
    notifyListeners();
  }

  void removeFromCart(String key) {
    _cart.removeWhere((e) => e.key == key);
    _cartService.saveCart(_cart);
    notifyListeners();
  }

  void updateQuantity(String key, int qty) {
    final idx = _cart.indexWhere((e) => e.key == key);
    if (idx < 0) return;
    if (qty <= 0) {
      _cart.removeAt(idx);
    } else {
      _cart[idx].quantity = qty;
    }
    _cartService.saveCart(_cart);
    notifyListeners();
  }

  void clearCart() {
    _cart.clear();
    _cartService.clearCart();
    notifyListeners();
  }
}
