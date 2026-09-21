import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/product.dart';
import '../../providers/app_state.dart';
import '../../shared/widgets/loading_widget.dart';

class ProductDetailScreen extends StatefulWidget {
  final String id;
  const ProductDetailScreen({super.key, required this.id});
  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  final ApiService _api = ApiService();
  Product? _product;
  bool _loading = true;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final p = await _api.getProduct(widget.id);
      if (mounted) setState(() { _product = p; _loading = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ في تحميل المنتج: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_product == null) return const Scaffold(body: Center(child: Text('الدواء غير موجود')));
    final p = _product!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 350,
            pinned: true,
            actions: [
              IconButton(icon: const Icon(Icons.share, color: Colors.black54), onPressed: () => Share.share('${p.name} - ${p.price} ج.م')),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: Colors.white,
                padding: const EdgeInsets.all(40),
                child: p.imageUrl != null 
                    ? CachedNetworkImage(
                        imageUrl: p.imageUrl!,
                        fit: BoxFit.contain,
                        placeholder: (context, url) => const ShimmerBox(width: double.infinity, height: 200),
                        errorWidget: (context, url, error) => const Icon(Icons.medication, size: 100, color: AppColors.primary),
                      )
                    : const Icon(Icons.medication, size: 100, color: AppColors.primary),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(p.name, style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.bold))),
                      Text('${p.price.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.primary)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(p.activeIngredient ?? 'لا توجد مادة فعالة', style: GoogleFonts.tajawal(fontSize: 16, color: AppColors.textMuted)),
                  const SizedBox(height: 24),
                  
                  if (p.requiresPrescription)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: AppColors.warningSurface, borderRadius: BorderRadius.circular(12)),
                      child: Row(
                        children: [
                          const Icon(Icons.warning, color: AppColors.warning),
                          const SizedBox(width: 8),
                          Text('يجب إرفاق وصفة طبية', style: GoogleFonts.tajawal(color: AppColors.warning, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  
                  const SizedBox(height: 24),
                  Text('الوصف', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(p.description ?? 'لا يوجد وصف متاح', style: GoogleFonts.tajawal(fontSize: 16, color: AppColors.textSecondary, height: 1.5)),
                  
                  const SizedBox(height: 120), // padding for bottom bar
                ],
              ),
            ),
          ),
        ],
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, -5))],
        ),
        child: SafeArea(
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                      icon: const Icon(Icons.remove, size: 20),
                      color: AppColors.primary,
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('$_quantity', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _quantity++),
                      icon: const Icon(Icons.add, size: 20),
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: p.isAvailable ? () {
                      for (var i = 0; i < _quantity; i++) {
                        context.read<AppState>().addToCart(p, pharmacyName: p.pharmacy?.name);
                      }
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text('تمت إضافة $_quantity للسلة', style: GoogleFonts.tajawal()),
                        backgroundColor: AppColors.success,
                      ));
                    } : null,
                    icon: const Icon(Icons.add_shopping_cart, size: 20),
                    label: Text('أضف للسلة', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
