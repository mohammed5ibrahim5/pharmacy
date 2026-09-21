import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../models/product.dart';
import '../providers/app_state.dart';
import 'package:go_router/go_router.dart';
import '../shared/widgets/loading_widget.dart';

class ProductCard extends StatelessWidget {
  final Product product;
  final String? pharmacyName;
  final VoidCallback? onTap;
  final bool showDiscount;
  final double? originalPrice;
  final bool isFavorite;
  final VoidCallback? onFavoriteToggle;

  const ProductCard({
    super.key,
    required this.product,
    this.pharmacyName,
    this.onTap,
    this.showDiscount = false,
    this.originalPrice,
    this.isFavorite = false,
    this.onFavoriteToggle,
  });

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final isFavorite = appState.isFavorite(product.id);
    
    return GestureDetector(
        onTap: onTap ?? () => context.push('/product/${product.id}'),
        child: Container(
          width: 160,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: Theme.of(context).brightness == Brightness.dark
                  ? AppColors.darkBorder
                  : AppColors.border,
            ),
            boxShadow: Theme.of(context).brightness == Brightness.dark
                ? AppShadow.darkSm
                : AppShadow.sm,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image Section
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    child: CachedNetworkImage(
                      imageUrl: product.imageUrl ?? '',
                      height: 120,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => const ShimmerBox(width: double.infinity, height: 120),
                      errorWidget: (context, url, error) => Container(
                        height: 120,
                        color: Theme.of(context).brightness == Brightness.dark
                            ? AppColors.darkBorder
                            : AppColors.borderLight,
                        child: Icon(
                          Icons.image_not_supported_outlined,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? AppColors.darkTextMuted
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                  ),
                  if (product.requiresPrescription)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'روشتة',
                          style: GoogleFonts.tajawal(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  if (showDiscount && originalPrice != null && originalPrice! > product.price)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.error,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Text(
                          '-${((originalPrice! - product.price) / originalPrice! * 100).toInt()}%',
                          style: GoogleFonts.tajawal(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  if (onFavoriteToggle != null || true)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: GestureDetector(
                        onTap: onFavoriteToggle ?? () => appState.toggleFavorite(product.id),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surface,
                            shape: BoxShape.circle,
                            boxShadow: Theme.of(context).brightness == Brightness.dark
                                ? AppShadow.darkSm
                                : [const BoxShadow(color: Colors.black12, blurRadius: 4)],
                          ),
                          child: Icon(
                            isFavorite ? Icons.favorite : Icons.favorite_border,
                            size: 16,
                            color: isFavorite
                                ? AppColors.error
                                : (Theme.of(context).brightness == Brightness.dark
                                    ? AppColors.darkTextMuted
                                    : AppColors.textMuted),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              
              // Content Section
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: GoogleFonts.tajawal(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: Theme.of(context).brightness == Brightness.dark
                            ? AppColors.darkText
                            : AppColors.text,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (pharmacyName != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        pharmacyName!,
                        style: GoogleFonts.tajawal(
                          fontSize: 11,
                          color: Theme.of(context).brightness == Brightness.dark
                              ? AppColors.darkTextMuted
                              : AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (showDiscount && originalPrice != null)
                              Text(
                                '${originalPrice!.toStringAsFixed(2)} ج.م',
                                style: GoogleFonts.tajawal(
                                  fontSize: 10,
                                  color: Theme.of(context).brightness == Brightness.dark
                                      ? AppColors.darkTextMuted
                                      : AppColors.textMuted,
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            Text(
                              '${product.price.toStringAsFixed(2)} ج.م',
                              style: GoogleFonts.tajawal(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        _AddToCartButton(product: product),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
    );
  }
}

class _AddToCartButton extends StatelessWidget {
  final Product product;

  const _AddToCartButton({required this.product});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final cartItem = appState.cart.where((item) => item.productId == product.id).firstOrNull;
    
    final quantity = cartItem?.quantity ?? 0;
    final key = '${product.id}:${product.pharmacyId}';

    if (quantity > 0) {
      return Container(
        height: 28,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                if (quantity == 1) {
                  appState.removeFromCart(key);
                } else {
                  appState.updateQuantity(key, quantity - 1);
                }
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Icon(Icons.remove, size: 14, color: AppColors.primary),
              ),
            ),
            Text(
              '$quantity',
              style: GoogleFonts.tajawal(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => appState.addToCart(product),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Icon(Icons.add, size: 14, color: AppColors.primary),
              ),
            ),
          ],
        ),
      );
    }

    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.sm),
      onTap: () => appState.addToCart(product),
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(
          Icons.add_shopping_cart,
          size: 16,
          color: Colors.white,
        ),
      ),
    );
  }
}
