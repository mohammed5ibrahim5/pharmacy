import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
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

  List<Product> _productResults = [];
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
    setState(() { _loading = true; _searched = true; });
    try {
      final results = await Future.wait([
        _api.getProducts(search: query),
        _api.getPharmacies(search: query),
      ]);
      if (!mounted) return;
      setState(() {
        _productResults = results[0] as List<Product>;
        _pharmacyResults = results[1] as List<Pharmacy>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('خطأ في البحث: $e'), backgroundColor: AppColors.error),
      );
    }
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
      backgroundColor: AppColors.background,
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
                    onPressed: () {
                      _searchCtrl.clear();
                      setState(() { _searched = false; _productResults = []; _pharmacyResults = []; });
                    },
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
          Text('جاري البحث...', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: AppColors.surface,
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
      label: Text(label, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: isSelected ? Colors.white : AppColors.text)),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) setState(() => _filter = value);
      },
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.background,
    );
  }

  Widget _buildInitialState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(color: AppColors.primarySurface, shape: BoxShape.circle),
            child: const Icon(Icons.search_rounded, size: 48, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          Text('ابدأ البحث', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 8),
          Text('ابحث عن الأدوية والصيدليات القريبة', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
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
            decoration: const BoxDecoration(color: AppColors.warningSurface, shape: BoxShape.circle),
            child: const Icon(Icons.search_off_rounded, size: 48, color: AppColors.warning),
          ),
          const SizedBox(height: 16),
          Text('لا توجد نتائج', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 8),
          Text('جرب كلمات بحث مختلفة', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
        ],
      ),
    );
  }

  Widget _buildProductResults() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72,
      ),
      itemCount: _productResults.length,
      itemBuilder: (ctx, i) {
        final p = _productResults[i];
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
                    decoration: const BoxDecoration(
                      color: AppColors.primarySurface,
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
              color: AppColors.surface, borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border), boxShadow: AppShadow.xs,
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.local_pharmacy_rounded, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(p.address, style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_left_rounded, color: AppColors.textMuted),
              ],
            ),
          ),
        );
      },
    );
  }
}
