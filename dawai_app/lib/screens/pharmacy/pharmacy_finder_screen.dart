import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
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
  List<Pharmacy> _pharmacies = [];
  List<Pharmacy> _filtered = [];
  bool _loading = true;
  bool _showMap = false;
  LatLng? _userLocation;

  String _searchQuery = '';
  bool _filterOpenNow = false;
  bool _filterDelivery = false;

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
    if (_filterOpenNow) list = list.where((p) => p.is24h).toList(); // simplified for demo
    setState(() => _filtered = list);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: TextField(
          decoration: InputDecoration(
            hintText: 'ابحث عن صيدلية...',
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            fillColor: Colors.transparent,
            prefixIcon: const Icon(Icons.search),
          ),
          onChanged: (v) { _searchQuery = v; _applyFilters(); },
        ),
        actions: [
          IconButton(
            icon: Icon(_showMap ? Icons.list : Icons.map),
            onPressed: () => setState(() => _showMap = !_showMap),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.surface,
            child: Row(
              children: [
                FilterChip(
                  label: Text('مفتوح الآن', style: GoogleFonts.tajawal()),
                  selected: _filterOpenNow,
                  onSelected: (v) { setState(() => _filterOpenNow = v); _applyFilters(); },
                ),
                const SizedBox(width: 8),
                FilterChip(
                  label: Text('يوصل', style: GoogleFonts.tajawal()),
                  selected: _filterDelivery,
                  onSelected: (v) { setState(() => _filterDelivery = v); _applyFilters(); },
                ),
              ],
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _showMap
                    ? _buildMap()
                    : _buildList(),
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_filtered.isEmpty) return Center(child: Text('لا توجد صيدليات', style: GoogleFonts.tajawal(fontSize: 18)));
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final p = _filtered[i];
        return ListTile(
          onTap: () => context.push('/pharmacy/${p.id}'),
          tileColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: AppColors.border)),
          leading: const CircleAvatar(backgroundColor: AppColors.primarySurface, child: Icon(Icons.local_pharmacy, color: AppColors.primary)),
          title: Text(p.name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          subtitle: Text(p.address, style: GoogleFonts.tajawal(fontSize: 12)),
          trailing: const Icon(Icons.chevron_left),
        );
      },
    );
  }

  Widget _buildMap() {
    final center = _userLocation ?? const LatLng(30.0444, 31.2357);
    return FlutterMap(
      options: MapOptions(initialCenter: center, initialZoom: 13),
      children: [
        TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.dawai.app'),
        MarkerLayer(
          markers: [
            if (_userLocation != null)
              Marker(point: _userLocation!, width: 40, height: 40, child: const Icon(Icons.my_location, color: Colors.blue, size: 30)),
            ..._filtered.where((p) => p.latitude != null && p.longitude != null).map((p) =>
              Marker(
                point: LatLng(p.latitude!, p.longitude!),
                width: 40, height: 40,
                child: GestureDetector(
                  onTap: () => context.push('/pharmacy/${p.id}'),
                  child: const Icon(Icons.location_on, color: AppColors.primary, size: 40),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
