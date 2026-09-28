import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../core/utils/direction.dart';
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
  final TextEditingController _searchCtrl = TextEditingController();
  List<Pharmacy> _pharmacies = [];
  List<Pharmacy> _filtered = [];
  bool _loading = true;
  bool _showMap = false;
  String? _error;
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

  @override
  void dispose() {
    _searchCtrl.dispose();
    _mapController.dispose();
    super.dispose();
  }

  /// Loads the pharmacy list and, best effort, the user's location.
  ///
  /// Location is deliberately non-fatal: a denied permission or a GPS timeout
  /// (LocationService caps the fix at 10s) must not prevent the list from
  /// rendering, so only the pharmacy query can put this screen into an error
  /// state — and even then the user gets a retry button rather than a spinner
  /// that never resolves.
  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait<dynamic>([
        _locationService.getCurrentPosition().catchError((_) => null),
        _api.getPharmacies(),
      ]);
      final pos = results[0];
      final pharmacies = results[1] as List<Pharmacy>;
      if (!mounted) return;
      setState(() {
        if (pos != null) _userLocation = LatLng(pos.latitude, pos.longitude);
        _pharmacies = pharmacies;
        _loading = false;
      });
      _applyFilters();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'تعذّر تحميل الصيدليات. تحقّق من اتصالك بالإنترنت.';
      });
    }
  }

  void _applyFilters() {
    final query = _searchQuery.trim();
    var list = _pharmacies
        .where((p) => query.isEmpty || p.name.contains(query))
        .toList();
    if (_filterDelivery) list = list.where((p) => p.deliveryAvailable).toList();
    if (_filterOpenNow) list = list.where(_isOpenNow).toList();
    if (_filter24h) list = list.where((p) => p.is24h).toList();
    setState(() => _filtered = list);
  }

  /// Whether [p] is open at the current time.
  ///
  /// Schedules are stored either as `HH:mm-HH:mm` (24h) or as a 12-hour range
  /// such as `9:00 AM - 10:00 PM`; the previous parser called `int.parse` on
  /// the `"00 AM"` fragment, the resulting FormatException was swallowed and
  /// every pharmacy fell through to `return true`. A schedule we cannot read
  /// is now treated as "don't know" and the pharmacy is excluded while the
  /// filter is on, rather than reported as always open.
  bool _isOpenNow(Pharmacy p) {
    if (p.is24h) return true;
    final hours = p.openingHours?.trim();
    if (hours == null || hours.isEmpty) return true;

    final parts = hours.split('-');
    if (parts.length != 2) return false;
    final open = _parseHour(parts[0]);
    final close = _parseHour(parts[1]);
    if (open == null || close == null) return false;

    final now = TimeOfDay.now();
    final nowMinutes = now.hour * 60 + now.minute;
    return nowMinutes >= open && nowMinutes <= close;
  }

  /// Parses `14:30` or `9:00 AM` into minutes since midnight.
  int? _parseHour(String raw) {
    final value = raw.trim().toUpperCase();
    final match = RegExp(r'^(\d{1,2}):(\d{2})\s*(AM|PM)?$').firstMatch(value);
    if (match == null) return null;
    var hour = int.tryParse(match.group(1)!);
    final minute = int.tryParse(match.group(2)!);
    if (hour == null || minute == null || hour > 23 || minute > 59) return null;

    final meridiem = match.group(3);
    if (meridiem != null) {
      if (hour > 12) return null;
      if (meridiem == 'AM' && hour == 12) hour = 0;
      if (meridiem == 'PM' && hour != 12) hour += 12;
    }
    return hour * 60 + minute;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            _buildSearchBar(),
            _buildFilterChips(),
            Expanded(
              child: _loading
                  ? _buildLoadingState()
                  : _error != null
                      ? _buildErrorState()
                      : _showMap
                          ? _buildMap()
                          : _buildList(),
            ),
          ],
        ),
      ),
      floatingActionButton: _error != null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => setState(() => _showMap = !_showMap),
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              icon: Icon(_showMap ? Icons.list_rounded : Icons.map_rounded),
              label: Text(_showMap ? 'القائمة' : 'الخريطة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
            ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.errorSurfaceOf(context),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.wifi_off_rounded, size: 44, color: AppColors.error),
            ),
            const SizedBox(height: 16),
            Text('مشكلة في التحميل', style: AppTypography.h3(context), textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              _error ?? '',
              style: AppTypography.caption(context),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh_rounded, size: 20),
              label: Text('إعادة المحاولة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
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
              color: AppColors.primarySurfaceOf(context),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: const Icon(Icons.local_pharmacy_rounded, color: AppColors.primary, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('الصيدليات القريبة', style: AppTypography.h2(context)),
                Text(
                  // `_filtered` is only populated after `_applyFilters()`, so
                  // during the initial load this used to flash "0 صيدلية".
                  _loading ? 'جاري التحميل...' : '${_filtered.length} صيدلية متاحة',
                  style: AppTypography.caption(context),
                ),
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
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.borderOf(context)),
          boxShadow: AppShadow.sm,
        ),
        child: TextField(
          controller: _searchCtrl,
          onChanged: (v) { _searchQuery = v; _applyFilters(); },
          style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textOf(context)),
          decoration: InputDecoration(
            hintText: 'ابحث عن صيدلية...',
            hintStyle: GoogleFonts.tajawal(color: AppColors.textMutedOf(context), fontSize: 14),
            prefixIcon: Icon(Icons.search_rounded, color: AppColors.textMutedOf(context), size: 22),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    tooltip: 'مسح البحث',
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () {
                      // Clearing the backing string alone left the typed text
                      // on screen: the field had no controller.
                      _searchCtrl.clear();
                      setState(() => _searchQuery = '');
                      _applyFilters();
                    },
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
          color: selected ? AppColors.primary : AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppRadius.full),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.borderOf(context),
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.tajawal(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.textSecondaryOf(context),
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
          Text('جاري تحميل الصيدليات...', style: AppTypography.body(context)),
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
                color: AppColors.primarySurfaceOf(context),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.local_pharmacy_outlined, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 16),
            Text('لا توجد صيدليات', style: AppTypography.h3(context)),
            const SizedBox(height: 8),
            Text('جرب البحث بكلمات مختلفة', style: AppTypography.caption(context)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.primary,
      child: ListView.separated(
        // Without this the list cannot overscroll when it is short, so
        // pull-to-refresh silently never fires.
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
        itemCount: _filtered.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (ctx, i) => _buildPharmacyCard(_filtered[i]),
      ),
    );
  }

  Widget _buildPharmacyCard(Pharmacy p) {
    return GestureDetector(
      onTap: () => context.push('/pharmacy/${p.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.borderOf(context)),
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
                        placeholder: (ctx, url) => Container(color: AppColors.primarySurfaceOf(context)),
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
                        child: Text(p.name, style: AppTypography.h3(context), maxLines: 1, overflow: TextOverflow.ellipsis),
                      ),
                      if (p.is24h)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.successSurfaceOf(context),
                            borderRadius: BorderRadius.circular(AppRadius.full),
                          ),
                          child: Text('24 ساعة', style: GoogleFonts.tajawal(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.success)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 16, color: AppColors.textMutedOf(context)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(p.address, style: AppTypography.caption(context), maxLines: 1, overflow: TextOverflow.ellipsis),
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
                          color: AppColors.accentSurfaceOf(context),
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
                            color: AppColors.infoSurfaceOf(context),
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
                          color: AppColors.primarySurfaceOf(context),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Icon(forwardIconOf(context), size: 20, color: AppColors.primary),
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
