import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../models/product.dart';
import '../../../widgets/product_card.dart';

class ProductsSection extends StatelessWidget {
  final List<Product> products;
  final bool isLoading;
  final bool isWide;
  final double padding;

  const ProductsSection({
    super.key,
    required this.products,
    required this.isLoading,
    required this.isWide,
    required this.padding,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const SizedBox.shrink(); // Could replace with shimmer loading
    }
    if (products.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: padding),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'الأدوية والمنتجات المتاحة',
                  style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                TextButton(
                  onPressed: () => context.push('/search'),
                  child: Text('تصفح الكل', style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 240,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: padding),
              itemCount: products.length > 8 ? 8 : products.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) {
                final p = products[i];
                return SizedBox(
                  width: 160,
                  child: ProductCard(
                    product: p,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
