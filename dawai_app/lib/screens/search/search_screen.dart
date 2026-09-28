import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../core/utils/api_error.dart';
import '../../core/utils/direction.dart';
import '../../shared/widgets/load_more_on_scroll.dart';
import '../../services/api_service.dart';
import '../../models/product.dart';
import '../../models/pharmacy.dart';

class SearchScreen extends StatefulWidget {
  final String? initialQuery;
  const SearchScreen({super.key, this.initialQuery});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchCtrl = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  Timer? _debounce;

  bool _loading = false;
  bool _searched = false;
  String _filter = 'products';

  /// The text currently being paged through — later pages must keep using it
  /// even if the field has since been edited but not yet re-submitted.
  String _query = '';

  List<Product> _productResults = [];
  int _productTotal = 0;
  bool _hasMoreProducts = false;
  bool _loadingMore = false;

  /// Bumped on every search. Responses that arrive for an older query are
  /// dropped instead of overwriting the newer ones, which is easy to hit with
  /// 400ms of debounce on a slow connection.
  int _searchSeq = 0;

  List<Pharmacy> _pharmacyResults = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialQuery != null && widget.initialQuery!.isNotEmpty) {
      _searchCtrl.text = widget.initialQuery!;
      _performSearch(_searchCtrl.text);
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) => _focusNode.requestFocus());
    }
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (query.trim().length >= 2) _performSearch(query);
    });
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) return;
    final seq = ++_searchSeq;
    final q = query.trim();
    setState(() {
      _loading = true;
      _searched = true;
      _query = q;
      _loadingMore = false;
    });
    try {
      final results = await Future.wait([
        _api.getProductPage(search: q, offset: 0),
        _api.getPharmacies(search: q),
      ]);
      if (!mounted || seq != _searchSeq) return;
      setState(() {
        final page = results[0] as ProductPage;
        _productResults = page.products;
        _productTotal = page.total;
        _hasMoreProducts = _productResults.length < _productTotal;
        _pharmacyResults = results[1] as List<Pharmacy>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || seq != _searchSeq) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyError(e, fallback: 'تعذّر إجراء البحث. حاول مرة أخرى.'), style: GoogleFonts.tajawal()), backgroundColor: AppColors.error),
      );
    }
  }

  /// Fetches the next page of product results for [_query].
  ///
  /// Guards behave like [CategoryScreen]'s: flip the flag before awaiting so
  /// the flood of scroll notifications cannot start a second request, and on
  /// failure leave the list retryable rather than dead.
  Future<void> _loadMoreProducts() async {
    if (_loading || _loadingMore || !_hasMoreProducts) return;
    _loadingMore = true;
    final seq = _searchSeq;
    setState(() {});
    try {
      final page = await _api.getProductPage(
        search: _query,
        offset: _productResults.length,
      );
      if (!mounted || seq != _searchSeq) return;
      setState(() {
        _productResults = [..._productResults, ...page.products];
        _productTotal = page.total;
        _hasMoreProducts = _productResults.length < _productTotal;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted || seq != _searchSeq) return;
      setState(() => _loadingMore = false);
    }
  }

  void _clearResults() {
    _searchCtrl.clear();
    ++_searchSeq;
    setState(() {
      _searched = false;
      _query = '';
      _productResults = [];
      _productTotal = 0;
      _hasMoreProducts = false;
      _loadingMore = false;
      _pharmacyResults = [];
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: AppColors.primary,
        iconTheme: const IconThemeData(color: Colors.white),
        title: TextField(
          controller: _searchCtrl,
          focusNode: _focusNode,
          autofocus: true,
          style: GoogleFonts.tajawal(color: Colors.white),
          onChanged: _onSearchChanged,
          decoration: InputDecoration(
            hintText: 'ابحث عن...',
            hintStyle: GoogleFonts.tajawal(color: Colors.white70),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_searchCtrl.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70, size: 20),
                    onPressed: _clearResults,
                  ),
                IconButton(
                  icon: const Icon(Icons.search, color: Colors.white),
                  onPressed: () => _performSearch(_searchCtrl.text),
                ),
              ],
            ),
          ),
          onSubmitted: _performSearch,
        ),
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: _loading
                ? _buildLoadingState()
                : (!_searched)
                    ? _buildInitialState()
                    : (_filter == 'products' && _productResults.isEmpty) || (_filter == 'pharmacies' && _pharmacyResults.isEmpty)
                        ? _buildEmptyState()
                        : _filter == 'products'
                            ? _buildProductResults()
                            : _buildPharmacyResults(),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(color: AppColors.primary),
          const SizedBox(height: 16),
          Text('جاري البحث...', style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context))),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: AppColors.surfaceOf(context),
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildFilterChip('products', 'المنتجات'),
          const SizedBox(width: 16),
          _buildFilterChip('pharmacies', 'الصيدليات'),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _filter == value;
    return ChoiceChip(
      label: Text(label, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : AppColors.textOf(context))),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) setState(() => _filter = value);
      },
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.backgroundOf(context),
    );
  }

  Widget _buildInitialState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), shape: BoxShape.circle),
            child: const Icon(Icons.search_rounded, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text('ابدأ البحث', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textOf(context))),
          const SizedBox(height: 8),
          Text('ابحث عن الأدوية والصيدليات القريبة', style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context))),
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
            decoration: BoxDecoration(color: AppColors.warningSurfaceOf(context), shape: BoxShape.circle),
            child: const Icon(Icons.search_off_rounded, size: 48, color: AppColors.warning),
          ),
          const SizedBox(height: 16),
          Text('لا توجد نتائج', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textOf(context))),
          const SizedBox(height: 8),
          Text('جرب كلمات بحث مختلفة', style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context))),
        ],
      ),
    );
  }

  Widget _buildProductResults() {
    return LoadMoreOnScroll(
      onLoadMore: _loadMoreProducts,
      threshold: 600,
      child: _buildProductGrid(),
    );
  }

  Widget _buildProductGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
      ),
      // One extra cell while the next page is in flight, drawn as a spinner.
      itemCount: _productResults.length + (_loadingMore ? 1 : 0),
      itemBuilder: (ctx, i) {
        if (i >= _productResults.length) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
          );
        }
        final p = _productResults[i];
        return GestureDetector(
          onTap: () => context.push('/product/${p.id}'),
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceOf(context), borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderOf(context)), boxShadow: AppShadow.sm,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurfaceOf(context),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                    ),
                    child: p.imageUrl != null
                        ? ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                            child: CachedNetworkImage(
                              imageUrl: p.imageUrl!, fit: BoxFit.cover,
                              placeholder: (ctx, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                              errorWidget: (ctx, url, error) => const Center(child: Icon(Icons.medication, size: 36, color: AppColors.primary)),
                            ),
                          )
                        : const Center(child: Icon(Icons.medication, size: 36, color: AppColors.primary)),
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
    );
  }

  Widget _buildPharmacyResults() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _pharmacyResults.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (ctx, i) {
        final p = _pharmacyResults[i];
        return GestureDetector(
          onTap: () => context.push('/pharmacy/${p.id}'),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceOf(context), borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderOf(context)), boxShadow: AppShadow.xs,
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.local_pharmacy_rounded, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(p.address, style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                Icon(forwardIconOf(context), color: AppColors.textMutedOf(context)),
              ],
            ),
          ),
        );
      },
    );
  }
}
