import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
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

  bool _loading = false;
  bool _searched = false;
  String _filter = 'products'; // 'products' or 'pharmacies'

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

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _searched = true;
    });
    try {
      final products = await _api.getProducts(search: query);
      final pharmacies = await _api.getPharmacies(search: query);
      if (!mounted) return;
      setState(() {
        _productResults = products;
        _pharmacyResults = pharmacies;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
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
          decoration: InputDecoration(
            hintText: 'ابحث عن...',
            hintStyle: GoogleFonts.tajawal(color: Colors.white70),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            fillColor: Colors.transparent,
            suffixIcon: IconButton(
              icon: const Icon(Icons.search, color: Colors.white),
              onPressed: () => _performSearch(_searchCtrl.text),
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
                ? const Center(child: CircularProgressIndicator())
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
          Icon(Icons.search, size: 80, color: AppColors.border),
          const SizedBox(height: 16),
          Text('ابدأ البحث عن الأدوية والصيدليات', style: GoogleFonts.tajawal(fontSize: 18, color: AppColors.textMuted)),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 80, color: AppColors.textMuted),
          const SizedBox(height: 16),
          Text('لا توجد نتائج', style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.text)),
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
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 0.75,
      ),
      itemCount: _productResults.length,
      itemBuilder: (ctx, i) {
        final p = _productResults[i];
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
                      color: AppColors.primarySurface,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                    ),
                    child: Center(child: p.imageUrl != null ? Image.network(p.imageUrl!) : const Icon(Icons.medication, size: 40, color: AppColors.primary)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold), maxLines: 2, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 8),
                      Text('${p.price.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16)),
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
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final p = _pharmacyResults[i];
        return ListTile(
          onTap: () => context.push('/pharmacy/${p.id}'),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
          tileColor: AppColors.surface,
          leading: const CircleAvatar(backgroundColor: AppColors.primarySurface, child: Icon(Icons.local_pharmacy, color: AppColors.primary)),
          title: Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          subtitle: Text(p.address, style: GoogleFonts.tajawal(fontSize: 12)),
          trailing: const Icon(Icons.chevron_left),
        );
      },
    );
  }
}
