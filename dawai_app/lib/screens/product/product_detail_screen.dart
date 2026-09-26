import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/product.dart';
import '../../providers/app_state.dart';

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
  bool _hasError = false;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _hasError = false; });
    try {
      final p = await _api.getProduct(widget.id);
      if (mounted) setState(() { _product = p; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _hasError = true; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: AppColors.primary)));
    }
    if (_hasError || _product == null) {
      return Scaffold(
        appBar: AppBar(title: Text('خطأ', style: GoogleFonts.tajawal())),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(color: AppColors.errorSurface, shape: BoxShape.circle),
                child: const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
              ),
              const SizedBox(height: 16),
              Text('الدواء غير موجود', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text('تحقق من الاتصال بالإنترنت وحاول مرة أخرى', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh, size: 20),
                label: Text('إعادة المحاولة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      );
    }
    final p = _product!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final maxQty = p.stockQuantity > 0 ? p.stockQuantity : 99;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 320,
            pinned: true,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white.withValues(alpha: 0.9),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: isDark ? AppColors.darkText : AppColors.text),
              ),
              onPressed: () => Navigator.pop(context),
            ),
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkSurface : Colors.white.withValues(alpha: 0.9),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.share_rounded, size: 18, color: isDark ? AppColors.darkText : AppColors.text),
                ),
                onPressed: () => SharePlus.instance.share(ShareParams(text: '${p.name} - ${p.price} ج.م')),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                color: isDark ? AppColors.darkSurface : AppColors.primarySurface,
                padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
                child: p.imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: p.imageUrl!,
                        fit: BoxFit.contain,
                        placeholder: (ctx, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        errorWidget: (ctx, url, error) => const Center(child: Icon(Icons.medication, size: 80, color: AppColors.primary)),
                      )
                    : const Center(child: Icon(Icons.medication, size: 80, color: AppColors.primary)),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkBackground : AppColors.background,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.name, style: GoogleFonts.tajawal(fontSize: 22, fontWeight: FontWeight.w800, color: isDark ? AppColors.darkText : AppColors.text)),
                            if (p.activeIngredient != null) ...[
                              const SizedBox(height: 4),
                              Text(p.activeIngredient!, style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textMuted)),
                            ],
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(p.price.toStringAsFixed(0), style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.primary)),
                          Text('ج.م', style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Badges
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (p.requiresPrescription)
                        _buildBadge(Icons.warning_rounded, 'روشتة', AppColors.warning, AppColors.warningSurface),
                      if (!p.isAvailable)
                        _buildBadge(Icons.inventory_2_outlined, 'نفدت', AppColors.error, AppColors.errorSurface),
                      if (p.isAvailable && p.stockQuantity > 0 && p.stockQuantity <= 10)
                        _buildBadge(Icons.inventory_rounded, 'متبقي ${p.stockQuantity}', AppColors.accent, AppColors.accentSurface),
                    ],
                  ),

                  const SizedBox(height: 20),
                  Text('الوصف', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700, color: isDark ? AppColors.darkText : AppColors.text)),
                  const SizedBox(height: 8),
                  Text(p.description ?? 'لا يوجد وصف متاح', style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textSecondary, height: 1.6)),

                  if (p.manufacturer != null) ...[
                    const SizedBox(height: 16),
                    _buildInfoRow(Icons.business_rounded, 'الشركة المصنعة', p.manufacturer!),
                  ],
                  if (p.dosage != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow(Icons.science_rounded, 'الجرعة', p.dosage!),
                  ],
                  if (p.howToUse != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow(Icons.info_outline_rounded, 'طريقة الاستخدام', p.howToUse!),
                  ],

                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : AppColors.surface,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, -4))],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              // Quantity
              Container(
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                      icon: const Icon(Icons.remove, size: 18),
                      color: AppColors.primary,
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text('$_quantity', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary)),
                    ),
                    IconButton(
                      onPressed: _quantity < maxQty ? () => setState(() => _quantity++) : null,
                      icon: const Icon(Icons.add, size: 18),
                      color: AppColors.primary,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              // Add to Cart
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
                    icon: const Icon(Icons.add_shopping_cart_rounded, size: 20),
                    label: Text(p.isAvailable ? 'أضف للسلة' : 'نفدت', style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: p.isAvailable ? AppColors.primary : AppColors.textMuted,
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

  Widget _buildBadge(IconData icon, String label, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(AppRadius.full)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(label, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
      ]),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
              Text(value, style: GoogleFonts.tajawal(fontSize: 13, color: AppColors.textSecondary)),
            ],
          ),
        ),
      ],
    );
  }
}
