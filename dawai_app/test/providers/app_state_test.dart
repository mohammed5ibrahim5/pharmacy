import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/models/customer.dart';
import 'package:dawai_app/models/product.dart';

// Minimal AppState-like cart logic for unit testing without Supabase
class TestCartState {
  final List<CartItem> _cart = [];
  List<CartItem> get cart => List.unmodifiable(_cart);

  int get cartCount => _cart.fold(0, (sum, item) => sum + item.quantity);
  double get cartTotal => _cart.fold(0, (sum, item) => sum + item.totalPrice);

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
      ));
    }
  }

  void removeFromCart(String key) {
    _cart.removeWhere((e) => e.key == key);
  }

  void updateQuantity(String key, int qty) {
    final idx = _cart.indexWhere((e) => e.key == key);
    if (idx < 0) return;
    if (qty <= 0) {
      _cart.removeAt(idx);
    } else {
      _cart[idx].quantity = qty;
    }
  }

  void clearCart() {
    _cart.clear();
  }
}

Product _makeProduct({
  String id = 'p1',
  String name = 'Paracetamol',
  double price = 15.0,
  String pharmacyId = 'ph1',
}) {
  return Product(
    id: id,
    pharmacyId: pharmacyId,
    name: name,
    price: price,
    createdAt: DateTime(2025),
  );
}

void main() {
  group('Cart operations', () {
    late TestCartState state;

    setUp(() {
      state = TestCartState();
    });

    test('starts empty', () {
      expect(state.cart, isEmpty);
      expect(state.cartCount, 0);
      expect(state.cartTotal, 0.0);
    });

    test('addToCart adds new item', () {
      final product = _makeProduct();
      state.addToCart(product);

      expect(state.cart.length, 1);
      expect(state.cart[0].productName, 'Paracetamol');
      expect(state.cart[0].quantity, 1);
      expect(state.cart[0].price, 15.0);
    });

    test('addToCart increments quantity for duplicate', () {
      final product = _makeProduct();
      state.addToCart(product);
      state.addToCart(product);

      expect(state.cart.length, 1);
      expect(state.cart[0].quantity, 2);
    });

    test('addToCart with different products adds separate items', () {
      state.addToCart(_makeProduct(id: 'p1', name: 'Para'));
      state.addToCart(_makeProduct(id: 'p2', name: 'Ibuprofen'));

      expect(state.cart.length, 2);
    });

    test('addToCart with different pharmacy same product adds separate items', () {
      state.addToCart(_makeProduct(id: 'p1', pharmacyId: 'ph1'));
      state.addToCart(_makeProduct(id: 'p1', pharmacyId: 'ph2'));

      expect(state.cart.length, 2);
    });

    test('removeFromCart removes correct item', () {
      state.addToCart(_makeProduct(id: 'p1'));
      state.addToCart(_makeProduct(id: 'p2'));

      state.removeFromCart('p1:ph1');

      expect(state.cart.length, 1);
      expect(state.cart[0].productId, 'p2');
    });

    test('removeFromCart with non-existent key does nothing', () {
      state.addToCart(_makeProduct());
      state.removeFromCart('nonexistent');

      expect(state.cart.length, 1);
    });

    test('updateQuantity changes quantity', () {
      state.addToCart(_makeProduct());
      state.updateQuantity('p1:ph1', 5);

      expect(state.cart[0].quantity, 5);
    });

    test('updateQuantity with 0 removes item', () {
      state.addToCart(_makeProduct());
      state.updateQuantity('p1:ph1', 0);

      expect(state.cart, isEmpty);
    });

    test('updateQuantity with negative removes item', () {
      state.addToCart(_makeProduct());
      state.updateQuantity('p1:ph1', -1);

      expect(state.cart, isEmpty);
    });

    test('updateQuantity with non-existent key does nothing', () {
      state.addToCart(_makeProduct());
      state.updateQuantity('nonexistent', 5);

      expect(state.cart[0].quantity, 1);
    });

    test('clearCart empties the cart', () {
      state.addToCart(_makeProduct(id: 'p1'));
      state.addToCart(_makeProduct(id: 'p2'));
      state.clearCart();

      expect(state.cart, isEmpty);
      expect(state.cartCount, 0);
      expect(state.cartTotal, 0.0);
    });

    test('cartCount sums all quantities', () {
      state.addToCart(_makeProduct(id: 'p1'));
      state.addToCart(_makeProduct(id: 'p1'));
      state.addToCart(_makeProduct(id: 'p2'));

      expect(state.cartCount, 3);
    });

    test('cartTotal sums all totalPrices', () {
      state.addToCart(_makeProduct(id: 'p1', price: 10.0));
      state.addToCart(_makeProduct(id: 'p2', price: 25.5));
      state.addToCart(_makeProduct(id: 'p1')); // duplicate increments qty

      // p1: 2 * 10 = 20, p2: 1 * 25.5 = 25.5
      expect(state.cartTotal, 45.5);
    });

    test('CartItem key format is productId:pharmacyId', () {
      state.addToCart(_makeProduct(id: 'med1', pharmacyId: 'store99'));

      expect(state.cart[0].key, 'med1:store99');
    });

    test('preserves prescription flag', () {
      final product = _makeProduct();
      final prescriptionProduct = Product(
        id: 'rx1',
        pharmacyId: 'ph1',
        name: 'Antibiotic',
        price: 50.0,
        requiresPrescription: true,
        createdAt: DateTime(2025),
      );

      state.addToCart(product);
      state.addToCart(prescriptionProduct);

      expect(state.cart[0].requiresPrescription, false);
      expect(state.cart[1].requiresPrescription, true);
    });

    test('multiple add/remove/update operations', () {
      state.addToCart(_makeProduct(id: 'p1', price: 10.0));
      state.addToCart(_makeProduct(id: 'p2', price: 20.0));
      state.addToCart(_makeProduct(id: 'p1')); // qty 2

      expect(state.cartCount, 3); // 2 + 1
      expect(state.cartTotal, 40.0); // 20 + 20

      state.updateQuantity('p2:ph1', 3);
      expect(state.cartCount, 5); // 2 + 3
      expect(state.cartTotal, 80.0); // 20 + 60

      state.removeFromCart('p1:ph1');
      expect(state.cartCount, 3);
      expect(state.cartTotal, 60.0);

      state.clearCart();
      expect(state.cartCount, 0);
      expect(state.cartTotal, 0.0);
    });
  });
}
