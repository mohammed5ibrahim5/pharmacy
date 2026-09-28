import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../models/product.dart';
import '../../../widgets/product_card.dart';
import '../../../shared/widgets/loading_widget.dart';

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
      return Padding(
        padding: const EdgeInsets.only(top: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: padding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const ShimmerBox(width: 180, height: 20),
                  const SizedBox(height: 4),
                  const ShimmerBox(width: 120, height: 14),
                ],
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 260,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: padding),
                itemCount: 4,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => const SizedBox(width: 160, child: ProductCardShimmer()),
              ),
            ),
          ],
        ),
      );
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
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), borderRadius: BorderRadius.circular(8)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.local_offer_outlined, size: 14, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text('أحدث المنتجات', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                      ]),
                    ),
                    const SizedBox(height: 6),
                    Text('الأدوية والمنتجات', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800)),
                  ],
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
            height: 260,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: padding),
              itemCount: products.length > 8 ? 8 : products.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) {
                final p = products[i];
                final isNew = DateTime.now().difference(p.createdAt).inDays < 7;
                return SizedBox(
                  width: 160,
                  child: ProductCard(
                    product: p,
                    badge: isNew ? 'جديد' : null,
                    badgeColor: isNew ? AppColors.success : null,
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
