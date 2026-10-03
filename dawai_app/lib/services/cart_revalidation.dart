import '../models/customer.dart';
import '../models/product.dart';

class CartRevalidationResult {
  const CartRevalidationResult({
    required this.missingProducts,
    required this.stockIssues,
    required this.priceChanges,
  });

  final List<String> missingProducts;
  final List<CartStockIssue> stockIssues;
  final List<CartPriceChange> priceChanges;

  bool get hasStockIssues =>
      missingProducts.isNotEmpty || stockIssues.isNotEmpty;
}

class CartStockIssue {
  const CartStockIssue({
    required this.productName,
    required this.available,
    required this.requested,
  });

  final String productName;
  final int available;
  final int requested;
}

CartRevalidationResult revalidateCart(
  List<CartItem> cart,
  List<Product> latestProducts,
) {
  final productsById = {
    for (final product in latestProducts) product.id: product,
  };
  final missingProducts = <String>{};
  final requestedByProductId = <String, int>{};
  final cartNameByProductId = <String, String>{};
  final priceChanges = <CartPriceChange>[];
  final comparedProductIds = <String>{};

  for (final item in cart) {
    final product = productsById[item.productId];
    if (product == null) {
      missingProducts.add(item.productName);
      continue;
    }
    requestedByProductId.update(
      item.productId,
      (quantity) => quantity + item.quantity,
      ifAbsent: () => item.quantity,
    );
    cartNameByProductId[item.productId] = item.productName;
    if (comparedProductIds.add(item.productId) &&
        item.price != product.price) {
      priceChanges.add(
        CartPriceChange(
          productName: item.productName,
          oldPrice: item.price,
          newPrice: product.price,
        ),
      );
    }
  }

  final stockIssues = <CartStockIssue>[];
  for (final entry in requestedByProductId.entries) {
    final product = productsById[entry.key]!;
    if (!product.isAvailable || product.stockQuantity < entry.value) {
      stockIssues.add(
        CartStockIssue(
          productName: product.name.isEmpty
              ? cartNameByProductId[entry.key]!
              : product.name,
          available: product.stockQuantity,
          requested: entry.value,
        ),
      );
    }
  }

  return CartRevalidationResult(
    missingProducts: missingProducts.toList(),
    stockIssues: stockIssues,
    priceChanges: priceChanges,
  );
}

CartPriceChange? refreshCartItem(CartItem item, Product product) {
  final change = item.price == product.price
      ? null
      : CartPriceChange(
          productName: item.productName,
          oldPrice: item.price,
          newPrice: product.price,
        );
  item.price = product.price;
  item.productName = product.name;
  item.imageUrl = product.imageUrl;
  item.requiresPrescription = product.requiresPrescription;
  item.deliveryFee = product.pharmacy?.deliveryFee;
  item.deliveryAvailable = product.pharmacy?.deliveryAvailable;
  item.forAllPharmacies = product.forAllPharmacies;
  item.isAvailable = product.isAvailable;
  item.stockQuantity = product.stockQuantity;
  return change;
}
