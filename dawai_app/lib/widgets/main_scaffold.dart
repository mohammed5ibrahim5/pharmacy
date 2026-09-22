import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import 'dart:ui';
import '../config/theme.dart';
import '../providers/app_state.dart';
import '../providers/language_provider.dart';
import '../services/api_service.dart';

class MainScaffold extends StatefulWidget {
  final Widget child;
  const MainScaffold({super.key, required this.child});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _notificationCount = 0;
  final ApiService _api = ApiService();
  Timer? _notificationTimer;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _notificationTimer = Timer.periodic(const Duration(minutes: 5), (_) => _loadNotifications());
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      final count = await _api.getUnreadNotificationsCount();
      if (mounted) setState(() => _notificationCount = count);
    } catch (e) {
      debugPrint('Failed to load notifications: $e');
    }
  }

  int _getCurrentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/health')) return 1;
    if (location.startsWith('/pharmacy-finder')) return 2;
    if (location.startsWith('/orders')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  void _onItemTapped(BuildContext context, int index) {
    switch (index) {
      case 0: context.go('/'); break;
      case 1: context.go('/health'); break;
      case 2: context.go('/pharmacy-finder'); break;
      case 3: context.go('/orders'); break;
      case 4: context.go('/profile'); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _getCurrentIndex(context);
    final appState = context.watch<AppState>();
    final lang = context.watch<LanguageProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      extendBody: true,
      body: SafeArea(
        bottom: false,
        child: widget.child,
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (appState.cartCount > 0)
            FloatingActionButton(
              heroTag: 'cart_fab',
              onPressed: () => context.push('/cart'),
              backgroundColor: AppColors.accent,
              mini: true,
              child: Badge(
                label: Text('${appState.cartCount}', style: const TextStyle(fontSize: 10, color: Colors.white)),
                backgroundColor: AppColors.error,
                child: const Icon(Icons.shopping_cart, color: Colors.white),
              ),
            ),
          const SizedBox(height: 10),
          FloatingActionButton(
            heroTag: 'prescription_fab',
            onPressed: () => context.push('/prescription-upload'),
            backgroundColor: AppColors.primary,
            child: const Icon(Icons.camera_alt, color: Colors.white),
          ),
        ],
      ),
      bottomNavigationBar: Container(
          margin: EdgeInsets.only(left: 16, right: 16, bottom: bottomPadding + 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            boxShadow: isDark ? AppShadow.darkMd : AppShadow.md,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(30),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                color: isDark
                    ? AppColors.darkSurface.withValues(alpha: 0.92)
                    : AppColors.surface.withValues(alpha: 0.92),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildNavItem(context, 0, Icons.home_rounded, lang.t('nav_home'), currentIndex),
                    _buildNavItem(context, 1, Icons.favorite_rounded, lang.t('nav_health'), currentIndex),
                    _buildNavItem(context, 2, Icons.local_pharmacy_rounded, lang.t('nav_pharmacies'), currentIndex),
                    _buildNavItem(context, 3, Icons.receipt_long_rounded, lang.t('nav_orders'), currentIndex, badge: _notificationCount),
                    _buildNavItem(context, 4, Icons.person_rounded, lang.t('nav_profile'), currentIndex),
                  ],
                ),
              ),
            ),
          ),
        ),
    );
  }

  Widget _buildNavItem(BuildContext context, int index, IconData icon, String label, int currentIndex, {int badge = 0}) {
    final isSelected = currentIndex == index;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeColor = isDark ? AppColors.primaryLight : AppColors.primary;
    final inactiveColor = isDark ? AppColors.darkTextMuted : AppColors.textSecondary;
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        _onItemTapped(context, index);
      },
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isSelected ? activeColor.withValues(alpha: 0.1) : Colors.transparent,
              shape: BoxShape.circle,
            ),
            child: Badge(
              isLabelVisible: badge > 0,
              label: Text('$badge', style: const TextStyle(fontSize: 9, color: Colors.white)),
              backgroundColor: AppColors.error,
              child: Icon(
                icon,
                color: isSelected ? activeColor : inactiveColor,
                size: 26,
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.tajawal(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? activeColor : inactiveColor,
            ),
          ),
          const SizedBox(height: 4),
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: 4,
            width: isSelected ? 16 : 0,
            decoration: BoxDecoration(
              color: activeColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ],
      ),
    );
  }
}
