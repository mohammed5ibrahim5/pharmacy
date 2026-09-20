import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/product.dart';
import '../../models/category.dart';

class CategoryScreen extends StatefulWidget {
  final String slug;
  const CategoryScreen({super.key, required this.slug});
  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  String? _error;
  bool _otcOnly = false;
  
  Category? _currentCategory;
  List<Product> _allProducts = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final categories = await _api.getCategories();
      final products = await _api.getProducts();
      if (!mounted) return;

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
      setState(() {
        _error = 'حدث خطأ';
        _loading = false;
      });
    }
  }

  List<Product> get _filteredProducts {
    var list = _allProducts;
    if (_otcOnly) list = list.where((p) => !p.requiresPrescription).toList();
    return list;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_error != null) return Scaffold(body: Center(child: Text(_error!)));
    
    final catName = _currentCategory?.name ?? widget.slug;
    final catColor = AppColors.getCategoryColor(widget.slug);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: catColor,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(catName, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(
            icon: Icon(_otcOnly ? Icons.filter_alt : Icons.filter_alt_outlined, color: Colors.white),
            onPressed: () => setState(() => _otcOnly = !_otcOnly),
            tooltip: 'بدون وصفة طبية فقط',
          ),
        ],
      ),
      body: _filteredProducts.isEmpty
          ? Center(child: Text('لا توجد منتجات', style: GoogleFonts.tajawal(fontSize: 18, color: AppColors.textMuted)))
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 0.7,
              ),
              itemCount: _filteredProducts.length,
              itemBuilder: (ctx, i) {
                final p = _filteredProducts[i];
                return GestureDetector(
                  onTap: () => context.push('/product/${p.id}'),
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                      boxShadow: AppShadow.xs,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color: catColor.withValues(alpha: 0.1),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                            ),
                            child: Center(
                              child: p.imageUrl != null 
                                  ? Image.network(p.imageUrl!)
                                  : Icon(Icons.medication, size: 48, color: catColor),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold), maxLines: 2, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 4),
                              Text('${p.price.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
