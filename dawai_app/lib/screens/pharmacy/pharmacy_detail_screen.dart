import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../core/utils/api_error.dart';
import '../../shared/widgets/load_more_on_scroll.dart';
import '../../services/api_service.dart';
import '../../models/pharmacy.dart';
import '../../models/product.dart';

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

  /// Total products this pharmacy has, used by the tab label. It is read from
  /// the query rather than from `_products.length`, which now only counts the
  /// pages loaded so far.
  int _total = 0;
  bool _hasMore = false;
  bool _loadingMore = false;

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
        _api.getProductPage(pharmacyId: widget.id, offset: 0),
      ]);
      if (mounted) {
        final page = results[1] as ProductPage;
        setState(() {
          _pharmacy = results[0] as Pharmacy?;
          _applyPage(page, replace: true);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(e, fallback: 'تعذّر تحميل الصيدلية.'), style: GoogleFonts.tajawal()), backgroundColor: AppColors.error),
        );
      }
    }
  }

  void _applyPage(ProductPage page, {required bool replace}) {
    _products = replace ? page.products : [..._products, ...page.products];
    _total = page.total;
    _hasMore = _products.length < _total;
  }

  /// Scroll-triggered; flips `_loadingMore` before awaiting so the next
  /// notification cannot duplicate the request, and stays retryable on error.
  Future<void> _loadMore() async {
    if (_loading || _loadingMore || !_hasMore) return;
    _loadingMore = true;
    setState(() {});
    try {
      final page = await _api.getProductPage(
        pharmacyId: widget.id,
        offset: _products.length,
      );
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

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (_pharmacy == null) {
      return Scaffold(
        appBar: AppBar(title: Text('خطأ', style: GoogleFonts.tajawal())),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: AppColors.error),
              const SizedBox(height: 16),
              Text('صيدلية غير موجودة', style: AppTypography.h3(context)),
            ],
          ),
        ),
      );
    }
    final p = _pharmacy!;

    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(p),
          SliverToBoxAdapter(child: _buildPharmacyInfo(p)),
          SliverPersistentHeader(
            pinned: true,
            delegate: _SliverAppBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textMutedOf(context),
                indicatorColor: AppColors.primary,
                indicatorWeight: 3,
                labelStyle: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 14),
                unselectedLabelStyle: GoogleFonts.tajawal(fontWeight: FontWeight.w500, fontSize: 14),
                tabs: [
                  Tab(text: 'المنتجات ($_total)'),
                  Tab(text: 'العنوان'),
                  Tab(text: 'التواصل'),
                ],
              ),
            ),
          ),
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildProductsTab(),
                _buildAboutTab(p),
                _buildContactTab(p),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar(Pharmacy p) {
    return SliverAppBar(
      expandedHeight: 220,
      pinned: true,
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      flexibleSpace: FlexibleSpaceBar(
        title: Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16)),
        background: Stack(
          fit: StackFit.expand,
          children: [
            p.coverUrl != null
                ? CachedNetworkImage(
                    imageUrl: p.coverUrl!,
                    fit: BoxFit.cover,
                    placeholder: (ctx, url) => Container(color: AppColors.primary),
                    errorWidget: (ctx, url, error) => Container(color: AppColors.primary),
                  )
                : Container(
                    decoration: const BoxDecoration(gradient: AppColors.heroGradient),
                    child: Center(
                      child: Icon(Icons.local_pharmacy_rounded, size: 60, color: Colors.white.withValues(alpha: 0.3)),
                    ),
                  ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent, Colors.black.withValues(alpha: 0.3)],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
          ],
        ),
      ),
      actions: [
        if (p.phone != null)
          IconButton(
            icon: const Icon(Icons.call_rounded),
            tooltip: 'اتصال',
            onPressed: () => _openExternal('tel:${p.phone}'),
          ),
        if (p.whatsapp != null)
          IconButton(
            icon: const Icon(Icons.chat_rounded),
            tooltip: 'واتساب',
            onPressed: () => _openExternal('https://wa.me/${p.whatsapp}'),
          ),
      ],
    );
  }

  /// Opens [raw] with the platform handler.
  ///
  /// Every contact action used to fire-and-forget `launchUrl`, so a device
  /// with no WhatsApp/mail handler — or a malformed `websiteUrl`/`phone` from
  /// the backend — threw a PlatformException inside the tap callback with no
  /// feedback. This reports the failure instead of crashing silently.
  Future<void> _openExternal(String raw) async {
    final uri = Uri.tryParse(raw);
    if (uri == null) {
      _showLaunchError();
      return;
    }
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        _showLaunchError();
      }
    } catch (_) {
      _showLaunchError();
    }
  }

  void _showLaunchError() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تعذّر فتح الرابط على هذا الجهاز.', style: GoogleFonts.tajawal()),
        backgroundColor: AppColors.error,
      ),
    );
  }

  Widget _buildPharmacyInfo(Pharmacy p) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Name & Type
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.name, style: AppTypography.h2(context)),
                    if (p.nameEn != null) ...[
                      const SizedBox(height: 2),
                      Text(p.nameEn!, style: AppTypography.caption(context, color: AppColors.textMutedOf(context))),
                    ],
                  ],
                ),
              ),
              if (p.pharmacyType != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurfaceOf(context),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(p.pharmacyType!, style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary)),
                ),
            ],
          ),

          const SizedBox(height: 14),

          // Rating & Status Row
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _buildInfoChip(Icons.star_rounded, '${p.rating}', AppColors.accent, AppColors.accentSurfaceOf(context)),
              if (p.is24h) _buildInfoChip(Icons.access_time_rounded, '24 ساعة', AppColors.success, AppColors.successSurfaceOf(context)),
              if (p.deliveryAvailable) _buildInfoChip(Icons.delivery_dining_rounded, 'يوصل', AppColors.info, AppColors.infoSurfaceOf(context)),
              if (p.hasParking) _buildInfoChip(Icons.local_parking_rounded, 'موقف سيارات', AppColors.textSecondaryOf(context), AppColors.borderLight),
              if (p.acceptInsurance) _buildInfoChip(Icons.shield_rounded, 'تأمين صحي', AppColors.textSecondaryOf(context), AppColors.borderLight),
            ],
          ),

          const SizedBox(height: 16),

          // Address
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.surfaceOf(context),
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: AppColors.borderOf(context)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primarySurfaceOf(context),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: const Icon(Icons.location_on_outlined, size: 20, color: AppColors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('العنوان', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMutedOf(context))),
                      const SizedBox(height: 2),
                      Text(p.address, style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textOf(context)), maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Opening Hours
          if (p.openingHours != null)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surfaceOf(context),
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.borderOf(context)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.accentSurfaceOf(context),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: const Icon(Icons.schedule_rounded, size: 20, color: AppColors.accent),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('مواعيد العمل', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMutedOf(context))),
                        const SizedBox(height: 2),
                        Text(p.openingHours!, style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textOf(context))),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String label, Color color, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }

  Widget _buildProductsTab() {
    if (_products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), shape: BoxShape.circle),
              child: const Icon(Icons.medication_outlined, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text('لا توجد منتجات', style: AppTypography.h3(context)),
            const SizedBox(height: 8),
            Text('لم تُضف منتجات لهذه الصيدلية بعد', style: AppTypography.caption(context)),
          ],
        ),
      );
    }

    return LoadMoreOnScroll(
      onLoadMore: _loadMore,
      threshold: 600,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.68,
        ),
        // One extra cell while the next page is in flight, drawn as a spinner
        // rather than an empty card.
        itemCount: _products.length + (_loadingMore ? 1 : 0),
        itemBuilder: (ctx, i) {
          if (i >= _products.length) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
            );
          }
          return _buildProductCard(_products[i]);
        },
      ),
    );
  }

  Widget _buildProductCard(Product p) {
    return GestureDetector(
      onTap: () => context.push('/product/${p.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.borderOf(context)),
          boxShadow: AppShadow.xs,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.primarySurfaceOf(context),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: p.imageUrl != null
                    ? ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                        child: CachedNetworkImage(
                          imageUrl: p.imageUrl!,
                          fit: BoxFit.cover,
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
                  Text(p.name, style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w700), maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(p.price.toStringAsFixed(0), style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary)),
                      const SizedBox(width: 2),
                      Text('ج.م', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textMutedOf(context))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAboutTab(Pharmacy p) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        if (p.description != null && p.description!.isNotEmpty) ...[
          _buildSectionTitle('عن الصيدلية'),
          const SizedBox(height: 10),
          Text(p.description!, style: GoogleFonts.tajawal(fontSize: 14, height: 1.6, color: AppColors.textSecondaryOf(context))),
          const SizedBox(height: 24),
        ],
        _buildSectionTitle('الخدمات'),
        const SizedBox(height: 12),
        _buildServiceRow(Icons.local_pharmacy_rounded, 'صيدلية عامة', p.pharmacyType ?? 'غير محدد'),
        if (p.deliveryAvailable) _buildServiceRow(Icons.delivery_dining_rounded, 'خدمة التوصيل', 'متاحة (${p.deliveryFee} ج.م)'),
        if (p.hasParking) _buildServiceRow(Icons.local_parking_rounded, 'موقف سيارات', 'متاح'),
        if (p.acceptInsurance) _buildServiceRow(Icons.shield_rounded, 'التأمين الصحي', 'مقبول'),
        if (p.is24h) _buildServiceRow(Icons.access_time_rounded, 'مواعيد العمل', 'مفتوح 24 ساعة'),
        if (p.openingHours != null && !p.is24h) _buildServiceRow(Icons.schedule_rounded, 'مواعيد العمل', p.openingHours!),
        const SizedBox(height: 24),
        _buildSectionTitle('الموقع'),
        const SizedBox(height: 12),
        Container(
          height: 180,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.borderOf(context)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            child: Image.network(
              'https://staticmap.openstreetmap.de/staticmap.php?center=${p.latitude},${p.longitude}&zoom=15&size=600x300&markers=${p.latitude},${p.longitude},red-pushpin',
              fit: BoxFit.cover,
              errorBuilder: (ctx, error, stack) => Container(
                color: AppColors.borderLight,
                child: Center(child: Icon(Icons.map_outlined, size: 48, color: AppColors.textMutedOf(context))),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildContactTab(Pharmacy p) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _buildSectionTitle('تواصل معنا'),
        const SizedBox(height: 16),

        if (p.phone != null)
          _buildContactCard(
            icon: Icons.call_rounded,
            title: 'الهاتف',
            subtitle: p.phone!,
            color: AppColors.success,
            onTap: () => _openExternal('tel:${p.phone}'),
          ),

        if (p.whatsapp != null) ...[
          const SizedBox(height: 12),
          _buildContactCard(
            icon: Icons.chat_rounded,
            title: 'واتساب',
            subtitle: p.whatsapp!,
            color: AppColors.whatsapp,
            onTap: () => _openExternal('https://wa.me/${p.whatsapp}'),
          ),
        ],

        if (p.email != null) ...[
          const SizedBox(height: 12),
          _buildContactCard(
            icon: Icons.email_outlined,
            title: 'البريد الإلكتروني',
            subtitle: p.email!,
            color: AppColors.info,
            onTap: () => _openExternal('mailto:${p.email}'),
          ),
        ],

        if (p.websiteUrl != null) ...[
          const SizedBox(height: 12),
          _buildContactCard(
            icon: Icons.language_rounded,
            title: 'الموقع الإلكتروني',
            subtitle: p.websiteUrl!,
            color: AppColors.secondary,
            onTap: () => _openExternal(p.websiteUrl!),
          ),
        ],

        const SizedBox(height: 24),

        // Delivery Info
        if (p.deliveryAvailable) ...[
          _buildSectionTitle('خدمة التوصيل'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.infoSurfaceOf(context),
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: AppColors.info.withValues(alpha: 0.2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.delivery_dining_rounded, color: AppColors.info, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('التوصيل متاح', style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.info)),
                      const SizedBox(height: 4),
                      Text('رسوم التوصيل: ${p.deliveryFee} ج.م', style: GoogleFonts.tajawal(fontSize: 13, color: AppColors.textSecondaryOf(context))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: AppTypography.h3(context));
  }

  Widget _buildServiceRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primarySurfaceOf(context),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(icon, size: 18, color: AppColors.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
                Text(value, style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.borderOf(context)),
          boxShadow: AppShadow.xs,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
                  const SizedBox(height: 2),
                  Text(subtitle, style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context)), maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: AppColors.textMutedOf(context)),
          ],
        ),
      ),
    );
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  _SliverAppBarDelegate(this.tabBar);
  @override double get minExtent => tabBar.preferredSize.height;
  @override double get maxExtent => tabBar.preferredSize.height;
  @override Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => Container(
    color: AppColors.surfaceOf(context),
    child: tabBar,
  );
  @override bool shouldRebuild(_SliverAppBarDelegate oldDelegate) => tabBar != oldDelegate.tabBar;
}
