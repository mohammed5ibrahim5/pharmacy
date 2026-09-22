import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../services/location_service.dart';
import '../../models/pharmacy.dart';

class PharmacyFinderScreen extends StatefulWidget {
  const PharmacyFinderScreen({super.key});
  @override
  State<PharmacyFinderScreen> createState() => _PharmacyFinderScreenState();
}

class _PharmacyFinderScreenState extends State<PharmacyFinderScreen> {
  final ApiService _api = ApiService();
  final LocationService _locationService = LocationService();
  final MapController _mapController = MapController();
  List<Pharmacy> _pharmacies = [];
  List<Pharmacy> _filtered = [];
  bool _loading = true;
  bool _showMap = false;
  LatLng? _userLocation;
  String _searchQuery = '';
  bool _filterOpenNow = false;
  bool _filterDelivery = false;
  bool _filter24h = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final pos = await _locationService.getCurrentPosition();
    if (pos != null) _userLocation = LatLng(pos.latitude, pos.longitude);
    final pharmacies = await _api.getPharmacies();
    if (mounted) {
      setState(() {
        _pharmacies = pharmacies;
        _loading = false;
      });
      _applyFilters();
    }
  }

  void _applyFilters() {
    var list = _pharmacies.where((p) => p.name.contains(_searchQuery)).toList();
    if (_filterDelivery) list = list.where((p) => p.deliveryAvailable).toList();
    if (_filterOpenNow) {
      final now = TimeOfDay.now();
      final nowMinutes = now.hour * 60 + now.minute;
      list = list.where((p) {
        if (p.is24h) return true;
        if (p.openingHours == null || p.openingHours!.isEmpty) return true;
        try {
          final parts = p.openingHours!.split('-');
          if (parts.length == 2) {
            final openParts = parts[0].trim().split(':');
            final closeParts = parts[1].trim().split(':');
            final openMinutes = int.parse(openParts[0]) * 60 + int.parse(openParts[1]);
            final closeMinutes = int.parse(closeParts[0]) * 60 + int.parse(closeParts[1]);
            return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
          }
        } catch (_) {}
        return true;
      }).toList();
    }
    if (_filter24h) list = list.where((p) => p.is24h).toList();
    setState(() => _filtered = list);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildSearchBar(),
            _buildFilterChips(),
            Expanded(
              child: _loading
                  ? _buildLoadingState()
                  : _showMap
                      ? _buildMap()
                      : _buildList(),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => setState(() => _showMap = !_showMap),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: Icon(_showMap ? Icons.list_rounded : Icons.map_rounded),
        label: Text(_showMap ? 'القائمة' : 'الخريطة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(Icons.local_pharmacy_rounded, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('الصيدليات القريبة', style: AppTypography.h2()),
                Text('${_filtered.length} صيدلية متاحة', style: AppTypography.caption()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.border),
          boxShadow: AppShadow.sm,
        ),
        child: TextField(
          onChanged: (v) { _searchQuery = v; _applyFilters(); },
          style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.text),
          decoration: InputDecoration(
            hintText: 'ابحث عن صيدلية...',
            hintStyle: GoogleFonts.tajawal(color: AppColors.textMuted, fontSize: 14),
            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 22),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () { _searchQuery = ''; _applyFilters(); },
                  )
                : null,
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        children: [
          _buildChip('الكل', !_filterOpenNow && !_filterDelivery && !_filter24h, () {
            setState(() { _filterOpenNow = false; _filterDelivery = false; _filter24h = false; });
            _applyFilters();
          }),
          const SizedBox(width: 8),
          _buildChip('مفتوح الآن', _filterOpenNow, () {
            setState(() { _filterOpenNow = !_filterOpenNow; });
            _applyFilters();
          }),
          const SizedBox(width: 8),
          _buildChip('يوصل', _filterDelivery, () {
            setState(() { _filterDelivery = !_filterDelivery; });
            _applyFilters();
          }),
          const SizedBox(width: 8),
          _buildChip('24 ساعة', _filter24h, () {
            setState(() { _filter24h = !_filter24h; });
            _applyFilters();
          }),
        ],
      ),
    );
  }

  Widget _buildChip(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.tajawal(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.textSecondary,
          ),
        ),
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
          Text('جاري تحميل الصيدليات...', style: AppTypography.body()),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.local_pharmacy_outlined, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text('لا توجد صيدليات', style: AppTypography.h3()),
            const SizedBox(height: 8),
            Text('جرب البحث بكلمات مختلفة', style: AppTypography.caption()),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.primary,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
        itemCount: _filtered.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (ctx, i) => _buildPharmacyCard(_filtered[i]),
      ),
    );
  }

  Widget _buildPharmacyCard(Pharmacy p) {
    return GestureDetector(
      onTap: () => context.push('/pharmacy/${p.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.border),
          boxShadow: AppShadow.sm,
        ),
        child: Column(
          children: [
            // Cover Image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: SizedBox(
                height: 120,
                width: double.infinity,
                child: p.coverUrl != null
                    ? CachedNetworkImage(
                        imageUrl: p.coverUrl!,
                        fit: BoxFit.cover,
                        placeholder: (ctx, url) => Container(color: AppColors.primarySurface),
                        errorWidget: (ctx, url, error) => _buildPlaceholderCover(),
                      )
                    : _buildPlaceholderCover(),
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(p.name, style: AppTypography.h3(), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                      if (p.is24h)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.successSurface,
                            borderRadius: BorderRadius.circular(AppRadius.full),
                          ),
                          child: Text('24 ساعة', style: GoogleFonts.tajawal(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.success)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 16, color: AppColors.textMuted),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(p.address, style: AppTypography.caption(), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      // Rating
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.accentSurface,
                          borderRadius: BorderRadius.circular(AppRadius.full),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded, size: 14, color: AppColors.accent),
                            const SizedBox(width: 2),
                            Text('${p.rating}', style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.accentDark)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Delivery
                      if (p.deliveryAvailable)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.infoSurface,
                            borderRadius: BorderRadius.circular(AppRadius.full),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.delivery_dining_rounded, size: 14, color: AppColors.info),
                              const SizedBox(width: 4),
                              Text('توصيل', style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.info)),
                            ],
                          ),
                        ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primarySurface,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: const Icon(Icons.chevron_left_rounded, size: 20, color: AppColors.primary),
                      ),
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

  Widget _buildPlaceholderCover() {
    return Container(
      decoration: const BoxDecoration(
        gradient: AppColors.primaryGradient,
      ),
      child: Center(
        child: Icon(Icons.local_pharmacy_rounded, size: 40, color: Colors.white.withValues(alpha: 0.8)),
      ),
    );
  }

  Widget _buildMap() {
    final center = _userLocation ?? const LatLng(30.0444, 31.2357);
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      child: FlutterMap(
        mapController: _mapController,
        options: MapOptions(initialCenter: center, initialZoom: 13),
        children: [
          TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.dawai.app'),
          MarkerLayer(
            markers: [
              if (_userLocation != null)
                Marker(
                  point: _userLocation!,
                  width: 44,
                  height: 44,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.blue,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3),
                      boxShadow: [BoxShadow(color: Colors.blue.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))],
                    ),
                    child: const Icon(Icons.my_location, color: Colors.white, size: 20),
                  ),
                ),
              ..._filtered.where((p) => p.latitude != 0 && p.longitude != 0).map((p) =>
                Marker(
                  point: LatLng(p.latitude, p.longitude),
                  width: 44,
                  height: 44,
                  child: GestureDetector(
                    onTap: () => context.push('/pharmacy/${p.id}'),
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: AppShadow.sm,
                      ),
                      child: const Icon(Icons.local_pharmacy, color: Colors.white, size: 18),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
