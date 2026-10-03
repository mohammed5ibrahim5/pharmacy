import 'package:flutter/material.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../services/cart_service.dart';
import '../services/cart_revalidation.dart';
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

  /// Guards against notifying after this provider has been disposed.
  bool _disposed = false;

  AppState() {
    // Supabase owns the session (expiry, refresh, sign-out); without this the
    // `isLoggedIn` getter went stale because nothing ever notified listeners
    // in response to an auth event — screens only rebuilt by luck, when some
    // unrelated navigation happened to run.
    api.client.auth.onAuthStateChange.listen((_) {
      if (!_disposed) notifyListeners();
    });
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  /// These are awaited in `main()` before the first frame, so the user cannot
  /// mutate the cart or favorites while the stored copy is still in flight —
  /// previously both futures were dropped on the floor and a late read would
  /// silently overwrite anything added in the meantime.
  Future<void> loadCart() async {
    try {
      _cart = await _cartService.getCart();
      notifyListeners();
    } catch (e) {
      debugPrint('loadCart failed: $e');
    }
  }

  Future<void> loadFavorites() async {
    try {
      _favoriteIds = await _favoritesService.getFavorites();
      notifyListeners();
    } catch (e) {
      debugPrint('loadFavorites failed: $e');
    }
  }

  bool isFavorite(String productId) => _favoriteIds.contains(productId);

  /// Optimistically flips the favorite, then persists that exact list.
  ///
  /// The previous implementation asked the service to re-read preferences and
  /// toggle them, then flipped the in-memory list independently — two rapid
  /// taps could both read the same snapshot and one change would be lost, and
  /// an in-flight `loadFavorites()` could leave the two stores permanently
  /// out of sync. Memory is now the single source of truth.
  Future<void> toggleFavorite(String productId) async {
    final next = List<String>.of(_favoriteIds);
    if (!next.remove(productId)) next.add(productId);
    _favoriteIds = next;
    notifyListeners();
    try {
      await _favoritesService.saveFavorites(next);
    } catch (e) {
      debugPrint('saveFavorites failed: $e');
    }
  }

  /// Adds [quantity] items in a single mutation.
  ///
  /// Callers used to loop `quantity` times over `addToCart`, which performed
  /// one SharedPreferences write and one `notifyListeners()` per unit — adding
  /// the maximum amount (99 when stock is unlimited) meant 99 synchronous JSON
  /// encodes and 99 full rebuilds from a single tap.
  void addToCart(Product product, {String? pharmacyName, int quantity = 1}) {
    if (quantity <= 0) return;
    final key = '${product.id}:${product.pharmacyId}';
    final existing = _cart.indexWhere((e) => e.key == key);
    if (existing >= 0) {
      _cart[existing].quantity += quantity;
    } else {
      _cart.add(CartItem(
        key: key,
        productId: product.id,
        pharmacyId: product.pharmacyId,
        productName: product.name,
        imageUrl: product.imageUrl,
        price: product.price,
        unit: product.unit,
        quantity: quantity,
        pharmacyName: pharmacyName ?? product.pharmacy?.name,
        requiresPrescription: product.requiresPrescription,
        deliveryFee: product.pharmacy?.deliveryFee,
        deliveryAvailable: product.pharmacy?.deliveryAvailable,
        forAllPharmacies: product.forAllPharmacies,
        isAvailable: product.isAvailable,
        stockQuantity: product.stockQuantity,
      ));
    }
    _persistCart();
    notifyListeners();
  }

  List<CartPriceChange> refreshCartProducts(List<Product> products) {
    final productsById = {for (final product in products) product.id: product};
    final priceChanges = <CartPriceChange>[];
    for (final item in _cart) {
      final product = productsById[item.productId];
      if (product == null) continue;
      final change = refreshCartItem(item, product);
      if (change != null) priceChanges.add(change);
    }
    _persistCart();
    notifyListeners();
    return priceChanges;
  }

  void removeFromCart(String key) {
    _cart.removeWhere((e) => e.key == key);
    _persistCart();
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
    _persistCart();
    notifyListeners();
  }

  void clearCart() {
    _cart.clear();
    _persistCart(clear: true);
    notifyListeners();
  }

  /// Writes through to disk without letting a failure surface as an unhandled
  /// async error — the old unguarded `saveCart()` calls swallowed persistence
  /// problems invisibly. The serialization itself runs synchronously inside
  /// `saveCart` before its first `await`, so it always captures this call's
  /// cart state even if the list mutates while the write is in flight.
  Future<void> _persistCart({bool clear = false}) async {
    try {
      if (clear) {
        await _cartService.clearCart();
      } else {
        await _cartService.saveCart(_cart);
      }
    } catch (e) {
      debugPrint('cart persistence failed: $e');
    }
  }
}
