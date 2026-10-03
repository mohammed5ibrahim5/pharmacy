import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/product.dart';
import '../../models/category.dart';
import '../../shared/widgets/loading_widget.dart';
import '../../shared/widgets/load_more_on_scroll.dart';

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
  List<Product> _products = [];

  /// Total rows matching the current filters, across every page. Drives the
  /// "N منتج" header and decides whether another page exists, so no trailing
  /// empty request is needed to discover the end of the list.
  int _total = 0;
  bool _hasMore = false;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _hasError = false;
      _loadingMore = false;
    });
    try {
      final categories = await _api.getCategories();
      if (!mounted) return;
      final merged = Category.mergeAndSort(categories);
      _currentCategory = merged
          .where((c) => c.slug.toLowerCase() == widget.slug.toLowerCase())
          .firstOrNull;
      await _reloadProducts();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _hasError = true;
      });
    }
  }

  /// Page zero. Assumes [_currentCategory] has already been resolved.
  Future<void> _reloadProducts() async {
    final page = await _fetchPage(0);
    if (!mounted) return;
    setState(() {
      _applyPage(page, replace: true);
      _loading = false;
      _loadingMore = false;
    });
  }

  Future<ProductPage> _fetchPage(int offset) async {
    final cat = _currentCategory;
    // An unknown slug has nothing to list. Asking without a category id would
    // hand back the entire catalogue under a title none of it belongs to —
    // which is what this screen used to do for every slug, by loading all
    // products and filtering them in the client.
    if (cat == null) return const ProductPage(products: [], total: 0);
    // If it's a fallback known category with no DB row, no products exist yet for it
    if (cat.id.startsWith('known-')) {
      return const ProductPage(products: [], total: 0);
    }
    return _api.getProductPage(
      categoryId: cat.id,
      otcOnly: _otcOnly,
      offset: offset,
    );
  }

  void _applyPage(ProductPage page, {required bool replace}) {
    _products = replace ? page.products : [..._products, ...page.products];
    _total = page.total;
    _hasMore = _products.length < _total;
  }

  /// Invoked from scroll notifications, i.e. constantly. The guard flips
  /// [_loadingMore] *before* the first `await` so the next notification
  /// cannot queue a duplicate request for the same window. On failure it
  /// stays retryable: scrolling again is the affordance already under the
  /// user's thumb.
  Future<void> _loadMore() async {
    if (_loading || _hasError || _loadingMore || !_hasMore) return;
    _loadingMore = true;
    setState(() {});
    try {
      final page = await _fetchPage(_products.length);
      if (!mounted) return;
      setState(() {
        _applyPage(page, replace: false);
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  /// The OTC switch now travels in the query rather than being a client-side
  /// `.where()` re-run for every grid cell on every build, so flipping it
  /// has to start over at page zero.
  Future<void> _toggleOtc() async {
    setState(() {
      _otcOnly = !_otcOnly;
      _loading = true;
      _hasError = false;
      _loadingMore = false;
    });
    try {
      await _reloadProducts();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _hasError = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final catName = _currentCategory?.displayName ?? widget.slug;
    final catColor = AppColors.getCategoryColor(widget.slug);

    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      appBar: AppBar(
        backgroundColor: catColor,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_currentCategory != null) ...[
              Text(
                _currentCategory!.displayIcon,
                style: const TextStyle(fontSize: 20),
              ),
              const SizedBox(width: 8),
            ],
            Flexible(
              child: Text(
                catName,
                style: GoogleFonts.tajawal(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          if (!_loading && !_hasError)
            IconButton(
              icon: Icon(
                _otcOnly ? Icons.filter_alt : Icons.filter_alt_outlined,
                color: Colors.white,
              ),
              onPressed: _toggleOtc,
              tooltip: 'بدون وصفة طبية فقط',
            ),
        ],
      ),
      body: _loading
          ? _buildLoadingState(catColor)
          : _hasError
          ? _buildErrorState()
          : _products.isEmpty
          ? _buildEmptyState()
          : _buildProductGrid(catColor),
    );
  }

  Widget _buildLoadingState(Color catColor) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.72,
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
            decoration: BoxDecoration(
              color: AppColors.errorSurfaceOf(context),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.wifi_off_rounded,
              size: 48,
              color: AppColors.error,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'فشل تحميل المنتجات',
            style: GoogleFonts.tajawal(
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'تحقق من الاتصال بالإنترنت',
            style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context)),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh, size: 20),
            label: Text(
              'إعادة المحاولة',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primarySurfaceOf(context),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.medication_outlined,
                size: 48,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'لا توجد منتجات',
              style: GoogleFonts.tajawal(
                fontSize: 20,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _otcOnly
                  ? 'لا توجد منتجات بدون وصفة طبية'
                  : 'لم تُضف منتجات لهذه الفئة بعد',
              style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            TextButton.icon(
              onPressed: _otcOnly ? _toggleOtc : () => context.push('/search'),
              icon: Icon(
                _otcOnly ? Icons.filter_alt_off_outlined : Icons.search_rounded,
              ),
              label: Text(
                _otcOnly ? 'عرض كل المنتجات' : 'استكشف منتجات أخرى',
                style: GoogleFonts.tajawal(fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductGrid(Color catColor) {
    // The paging trigger wraps the grid from outside so the body below is
    // unchanged whether or not there is another page waiting.
    return LoadMoreOnScroll(
      onLoadMore: _loadMore,
      threshold: 600,
      child: _buildGridBody(catColor),
    );
  }

  Widget _buildGridBody(Color catColor) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              Text(
                '$_total منتج',
                style: GoogleFonts.tajawal(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMutedOf(context),
                ),
              ),
              const Spacer(),
              if (_otcOnly)
                GestureDetector(
                  onTap: () => setState(() => _otcOnly = false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primarySurfaceOf(context),
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'بدون وصفة',
                          style: GoogleFonts.tajawal(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.close,
                          size: 14,
                          color: AppColors.primary,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.72,
            ),
            // One extra cell while the next page is in flight, drawn as a
            // spinner rather than an empty card.
            itemCount: _products.length + (_loadingMore ? 1 : 0),
            itemBuilder: (ctx, i) {
              if (i >= _products.length) {
                return const Center(
                  child: CircularProgressIndicator(
                    color: AppColors.primary,
                    strokeWidth: 2,
                  ),
                );
              }
              final p = _products[i];
              return GestureDetector(
                onTap: () => context.push('/product/${p.id}'),
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceOf(context),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderOf(context)),
                    boxShadow: AppShadow.sm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: catColor.withValues(alpha: 0.08),
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(16),
                            ),
                          ),
                          child: p.imageUrl != null
                              ? ClipRRect(
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(16),
                                  ),
                                  child: CachedNetworkImage(
                                    imageUrl: p.imageUrl!,
                                    fit: BoxFit.cover,
                                    placeholder: (ctx, url) => const Center(
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    ),
                                    errorWidget: (ctx, url, error) => Icon(
                                      Icons.medication,
                                      size: 36,
                                      color: catColor,
                                    ),
                                  ),
                                )
                              : Center(
                                  child: Icon(
                                    Icons.medication,
                                    size: 36,
                                    color: catColor,
                                  ),
                                ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              p.name,
                              style: GoogleFonts.tajawal(
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${p.price.toStringAsFixed(0)} ج.م',
                              style: GoogleFonts.tajawal(
                                color: AppColors.primary,
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                              ),
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
        ),
      ],
    );
  }
}
