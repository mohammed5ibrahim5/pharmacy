import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../models/category.dart';
import '../../../models/product.dart';
import '../../../shared/widgets/loading_widget.dart';

class CategoriesSection extends StatefulWidget {
  final List<Category> categories;
  final List<Product> products;
  final bool isLoading;
  final ScrollController scrollCtrl;
  final bool isWide;
  final double padding;

  const CategoriesSection({
    super.key,
    required this.categories,
    required this.products,
    required this.isLoading,
    required this.scrollCtrl,
    required this.isWide,
    required this.padding,
  });

  @override
  State<CategoriesSection> createState() => _CategoriesSectionState();
}

class _CategoriesSectionState extends State<CategoriesSection> {
  bool _showLeftArrow = false;
  bool _showRightArrow = true;

  @override
  void initState() {
    super.initState();
    widget.scrollCtrl.addListener(_updateArrows);
  }

  @override
  void dispose() {
    widget.scrollCtrl.removeListener(_updateArrows);
    super.dispose();
  }

  void _updateArrows() {
    final pos = widget.scrollCtrl.position;
    setState(() {
      _showLeftArrow = pos.pixels > 20;
      _showRightArrow = pos.pixels < pos.maxScrollExtent - 20;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading || widget.categories.isEmpty) {
      if (!widget.isLoading) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(top: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: widget.padding),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(width: 150, height: 20),
                  SizedBox(height: 4),
                  ShimmerBox(width: 100, height: 14),
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 90,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: widget.padding),
                itemCount: 6,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => ShimmerBox(width: 80, height: 80, borderRadius: 16),
              ),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: widget.padding),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(8)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.shopping_bag_outlined, size: 14, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text('تصفح الأقسام', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary)),
                      ]),
                    ),
                    const SizedBox(height: 8),
                    Text('تسوق حسب الفئة', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800)),
                  ],
                ),
                GestureDetector(
                  onTap: () => context.push('/search'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
                    child: Text('عرض الكل', style: GoogleFonts.tajawal(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 130,
            child: Stack(
              children: [
                ListView.separated(
                  controller: widget.scrollCtrl,
                  scrollDirection: Axis.horizontal,
                  padding: EdgeInsets.symmetric(horizontal: widget.padding + 8),
                  itemCount: widget.categories.length,
                  separatorBuilder: (_, i) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final cat = widget.categories[index];
                    final gradient = AppColors.getCategoryGradient(cat.slug);
                    final count = widget.products.where((p) => p.categoryId == cat.id).length;
                    return GestureDetector(
                      onTap: () => context.push('/category/${cat.slug}'),
                      child: Container(
                        width: 130,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: gradient),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [BoxShadow(color: gradient[0].withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 6))],
                        ),
                        child: Stack(
                          children: [
                            Positioned(top: -15, right: -15, child: Container(width: 50, height: 50, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), shape: BoxShape.circle))),
                            Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    width: 46, height: 46,
                                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withValues(alpha: 0.3))),
                                    child: Center(child: Text(cat.icon ?? '💊', style: const TextStyle(fontSize: 24))),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(cat.name, style: GoogleFonts.tajawal(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                                    child: Text('$count منتج', style: GoogleFonts.tajawal(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w600)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                if (_showLeftArrow)
                  Positioned(
                    left: 4, top: 0, bottom: 0,
                    child: Center(
                      child: GestureDetector(
                        onTap: () => widget.scrollCtrl.animateTo(widget.scrollCtrl.offset - 140, duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
                        child: Container(width: 32, height: 32, decoration: BoxDecoration(color: AppColors.surface, shape: BoxShape.circle, boxShadow: AppShadow.sm, border: Border.all(color: AppColors.border)),
                          child: const Icon(Icons.chevron_left, size: 20, color: AppColors.text)),
                      ),
                    ),
                  ),
                if (_showRightArrow)
                  Positioned(
                    right: 4, top: 0, bottom: 0,
                    child: Center(
                      child: GestureDetector(
                        onTap: () => widget.scrollCtrl.animateTo(widget.scrollCtrl.offset + 140, duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
                        child: Container(width: 32, height: 32, decoration: BoxDecoration(color: AppColors.surface, shape: BoxShape.circle, boxShadow: AppShadow.sm, border: Border.all(color: AppColors.border)),
                          child: const Icon(Icons.chevron_right, size: 20, color: AppColors.text)),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
