import 'package:flutter_test/flutter_test.dart';
import 'package:dawai_app/models/customer.dart';
import 'package:dawai_app/models/product.dart';
import 'package:dawai_app/services/cart_revalidation.dart';

CartItem cartItem({
  String key = 'p1:ph1',
  String productId = 'p1',
  double price = 10,
  int quantity = 1,
}) =>
    CartItem(
      key: key,
      productId: productId,
      pharmacyId: 'ph1',
      productName: 'Medicine',
      price: price,
      quantity: quantity,
    );

Product product({
  String id = 'p1',
  double price = 10,
  int stock = 5,
  bool available = true,
}) =>
    Product(
      id: id,
      pharmacyId: 'ph1',
      name: 'Medicine',
      price: price,
      stockQuantity: stock,
      isAvailable: available,
      createdAt: DateTime(2025),
    );

void main() {
  group('revalidateCart', () {
    test('reports missing products without treating them as in stock', () {
      final result = revalidateCart([cartItem()], const []);

      expect(result.missingProducts, ['Medicine']);
      expect(result.hasStockIssues, isTrue);
    });

    test('aggregates duplicate product quantities before checking stock', () {
      final result = revalidateCart(
        [
          cartItem(key: 'p1:ph1', quantity: 2),
          cartItem(key: 'p1:ph2', quantity: 2),
        ],
        [product(stock: 3)],
      );

      expect(result.stockIssues, hasLength(1));
      expect(result.stockIssues.single.requested, 4);
      expect(result.stockIssues.single.available, 3);
    });

    test('blocks products marked unavailable even with a positive stock value', () {
      final result = revalidateCart(
        [cartItem()],
        [product(stock: 4, available: false)],
      );

      expect(result.stockIssues, hasLength(1));
      expect(result.stockIssues.single.available, 4);
    });

    test('requires review when the current product price changed', () {
      final result = revalidateCart(
        [cartItem(price: 10)],
        [product(price: 12.5)],
      );

      expect(result.hasStockIssues, isFalse);
      expect(result.priceChanges, hasLength(1));
      expect(result.priceChanges.single.oldPrice, 10);
      expect(result.priceChanges.single.newPrice, 12.5);
    });

    test('reports price changes even when stock also prevents checkout', () {
      final result = revalidateCart(
        [cartItem(price: 10, quantity: 3)],
        [product(price: 12.5, stock: 2)],
      );

      expect(result.stockIssues, hasLength(1));
      expect(result.priceChanges, hasLength(1));
    });

    test('accepts an available product at the requested quantity', () {
      final result = revalidateCart(
        [cartItem(quantity: 3)],
        [product(stock: 3)],
      );

      expect(result.hasStockIssues, isFalse);
      expect(result.priceChanges, isEmpty);
    });

    test('refreshes cached cart fields but keeps selected quantity', () {
      final item = cartItem(price: 10, quantity: 2);
      final latest = product(price: 12.5, stock: 4);

      final change = refreshCartItem(item, latest);

      expect(change?.oldPrice, 10);
      expect(change?.newPrice, 12.5);
      expect(item.price, 12.5);
      expect(item.stockQuantity, 4);
      expect(item.isAvailable, isTrue);
      expect(item.quantity, 2);
    });
  });
}
