import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/product.dart';
import '../../models/category.dart';
import '../../shared/widgets/loading_widget.dart';

class CategoryScreen extends StatefulWidget {
  final String slug;
  const CategoryScreen({super.key, required this.slug});
  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  bool _hasError = false;
  bool _otcOnly = false;

  Category? _currentCategory;
  List<Product> _allProducts = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() { _loading = true; _hasError = false; });
    try {
      final results = await Future.wait([
        _api.getCategories(),
        _api.getProducts(),
      ]);
      if (!mounted) return;

      final categories = results[0] as List<Category>;
      final products = results[1] as List<Product>;
      final cat = categories.where((c) => c.slug == widget.slug).firstOrNull;
      final catProducts = cat != null
          ? products.where((p) => p.categoryId == cat.id).toList()
          : products;

      setState(() {
        _currentCategory = cat;
        _allProducts = catProducts;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() { _loading = false; _hasError = true; });
    }
  }

  List<Product> get _filteredProducts {
    var list = _allProducts;
    if (_otcOnly) list = list.where((p) => !p.requiresPrescription).toList();
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final catName = _currentCategory?.name ?? widget.slug;
    final catColor = AppColors.getCategoryColor(widget.slug);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: catColor,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(catName, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          if (!_loading && !_hasError)
            IconButton(
              icon: Icon(_otcOnly ? Icons.filter_alt : Icons.filter_alt_outlined, color: Colors.white),
              onPressed: () => setState(() => _otcOnly = !_otcOnly),
              tooltip: 'بدون وصفة طبية فقط',
            ),
        ],
      ),
      body: _loading
          ? _buildLoadingState(catColor)
          : _hasError
              ? _buildErrorState()
              : _filteredProducts.isEmpty
                  ? _buildEmptyState()
                  : _buildProductGrid(catColor),
    );
  }

  Widget _buildLoadingState(Color catColor) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
      ),
      itemCount: 6,
      itemBuilder: (ctx, i) => const ProductCardShimmer(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(color: AppColors.errorSurface, shape: BoxShape.circle),
            child: const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.error),
          ),
          const SizedBox(height: 16),
          Text('فشل تحميل المنتجات', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('تحقق من الاتصال بالإنترنت', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh, size: 20),
            label: Text('إعادة المحاولة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(color: AppColors.primarySurface, shape: BoxShape.circle),
            child: const Icon(Icons.medication_outlined, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text('لا توجد منتجات', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text(_otcOnly ? 'لا توجد منتجات بدون وصفة طبية' : 'لم تُضف منتجات لهذه الفئة بعد', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
        ],
      ),
    );
  }

  Widget _buildProductGrid(Color catColor) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Text('${_filteredProducts.length} منتج', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
              const Spacer(),
              if (_otcOnly)
                GestureDetector(
                  onTap: () => setState(() => _otcOnly = false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(AppRadius.full)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text('بدون وصفة', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary)),
                      const SizedBox(width: 4),
                      const Icon(Icons.close, size: 14, color: AppColors.primary),
                    ]),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
            ),
            itemCount: _filteredProducts.length,
            itemBuilder: (ctx, i) {
              final p = _filteredProducts[i];
              return GestureDetector(
                onTap: () => context.push('/product/${p.id}'),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.surface, borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border), boxShadow: AppShadow.sm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: catColor.withValues(alpha: 0.08),
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                          ),
                          child: p.imageUrl != null
                              ? ClipRRect(
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                  child: CachedNetworkImage(
                                    imageUrl: p.imageUrl!, fit: BoxFit.cover,
                                    placeholder: (ctx, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                    errorWidget: (ctx, url, error) => Icon(Icons.medication, size: 36, color: catColor),
                                  ),
                                )
                              : Center(child: Icon(Icons.medication, size: 36, color: catColor)),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text('${p.price.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.w800, fontSize: 15)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
