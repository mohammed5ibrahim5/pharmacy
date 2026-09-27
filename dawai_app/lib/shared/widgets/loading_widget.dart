import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../config/theme.dart';

class ShimmerBox extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8.0,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? Colors.grey.shade700 : Colors.grey.shade300,
      highlightColor: isDark ? Colors.grey.shade600 : Colors.grey.shade100,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: isDark ? Colors.grey.shade800 : Colors.white,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

class ProductCardShimmer extends StatelessWidget {
  const ProductCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: 160,
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkBorder : Colors.grey.shade200),
      ),
      padding: const EdgeInsets.all(8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ShimmerBox(width: double.infinity, height: 120, borderRadius: 12),
          const SizedBox(height: 12),
          const ShimmerBox(width: 100, height: 16),
          const SizedBox(height: 8),
          const ShimmerBox(width: 140, height: 14),
          const Spacer(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const ShimmerBox(width: 60, height: 18),
              ShimmerBox(width: 32, height: 32, borderRadius: 16),
            ],
          ),
        ],
      ),
    );
  }
}

class PharmacyCardShimmer extends StatelessWidget {
  const PharmacyCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkBorder : Colors.grey.shade200),
      ),
      child: Row(
        children: [
          const ShimmerBox(width: 80, height: 80, borderRadius: 12),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ShimmerBox(width: 150, height: 18),
                const SizedBox(height: 8),
                const ShimmerBox(width: 100, height: 14),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Flexible(
                      child: ShimmerBox(width: 80, height: 14),
                    ),
                    const SizedBox(width: 8),
                    const Flexible(
                      child: ShimmerBox(width: 60, height: 14),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
