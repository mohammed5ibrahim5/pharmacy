import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/pharmacy.dart';
import '../../models/product.dart';
import '../../shared/widgets/loading_widget.dart';

class PharmacyDetailScreen extends StatefulWidget {
  final String id;
  const PharmacyDetailScreen({super.key, required this.id});

  @override
  State<PharmacyDetailScreen> createState() => _PharmacyDetailScreenState();
}

class _PharmacyDetailScreenState extends State<PharmacyDetailScreen> with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  Pharmacy? _pharmacy;
  List<Product> _products = [];
  bool _loading = true;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        _api.getPharmacy(widget.id),
        _api.getProducts(pharmacyId: widget.id),
      ]);
      if (mounted) {
        setState(() {
          _pharmacy = results[0] as Pharmacy?;
          _products = results[1] as List<Product>;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ في تحميل الصيدلية: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_pharmacy == null) return const Scaffold(body: Center(child: Text('صيدلية غير موجودة')));
    final p = _pharmacy!;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, inner) => [
          SliverAppBar(
            expandedHeight: 250,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  p.coverUrl != null
                      ? Image.network(p.coverUrl!, fit: BoxFit.cover)
                      : Container(color: AppColors.primary),
                  Container(decoration: BoxDecoration(gradient: LinearGradient(colors: [Colors.black54, Colors.transparent], begin: Alignment.bottomCenter, end: Alignment.topCenter))),
                ],
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _SliverAppBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textMuted,
                indicatorColor: AppColors.primary,
                tabs: [
                  Tab(child: Text('المنتجات', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold))),
                  Tab(child: Text('عن الصيدلية', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold))),
                  Tab(child: Text('التقييمات', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold))),
                ],
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildProductsTab(),
            _buildAboutTab(p),
            _buildReviewsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildProductsTab() {
    if (_products.isEmpty) return Center(child: Text('لا توجد منتجات', style: GoogleFonts.tajawal(fontSize: 18, color: AppColors.textMuted)));
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 16, crossAxisSpacing: 16, childAspectRatio: 0.75),
      itemCount: _products.length,
      itemBuilder: (ctx, i) {
        final p = _products[i];
        return GestureDetector(
          onTap: () => context.push('/product/${p.id}'),
          child: Container(
            decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border), boxShadow: AppShadow.xs),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: const BorderRadius.vertical(top: Radius.circular(16))),
                    child: Center(child: p.imageUrl != null 
                        ? CachedNetworkImage(
                            imageUrl: p.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => const ShimmerBox(width: double.infinity, height: double.infinity),
                            errorWidget: (context, url, error) => const Icon(Icons.medication, size: 40, color: AppColors.primary),
                          )
                        : const Icon(Icons.medication, size: 40, color: AppColors.primary)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 4),
                      Text('${p.price.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.bold)),
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

  Widget _buildAboutTab(Pharmacy p) {
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Row(children: [
          const Icon(Icons.location_on, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(child: Text(p.address, style: GoogleFonts.tajawal(fontSize: 16))),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          const Icon(Icons.star, color: Colors.amber),
          const SizedBox(width: 8),
          Text('${p.rating} تقييم ممتاز', style: GoogleFonts.tajawal(fontSize: 16)),
        ]),
        const SizedBox(height: 16),
        if (p.is24h) Row(children: [
          const Icon(Icons.access_time, color: Colors.green),
          const SizedBox(width: 8),
          Text('مفتوح 24 ساعة', style: GoogleFonts.tajawal(fontSize: 16)),
        ]),
      ],
    );
  }

  Widget _buildReviewsTab() {
    return Center(child: Text('التقييمات قريباً...', style: GoogleFonts.tajawal(fontSize: 18, color: AppColors.textMuted)));
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  _SliverAppBarDelegate(this.tabBar);
  @override double get minExtent => tabBar.preferredSize.height;
  @override double get maxExtent => tabBar.preferredSize.height;
  @override Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => Container(color: AppColors.surface, child: tabBar);
  @override bool shouldRebuild(_SliverAppBarDelegate oldDelegate) => false;
}
