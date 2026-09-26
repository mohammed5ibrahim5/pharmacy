import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/home/home_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/pharmacy/pharmacy_detail_screen.dart';
import '../screens/pharmacy/pharmacy_finder_screen.dart';
import '../screens/product/product_detail_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/orders/order_detail_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/prescription/prescription_upload_screen.dart';
import '../screens/search/search_screen.dart';
import '../screens/category/category_screen.dart';
import '../screens/health/health_screen.dart';
import '../screens/health/refill_reminder_screen.dart';
import '../screens/loyalty/loyalty_screen.dart';
import '../widgets/main_scaffold.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  routes: [
    ShellRoute(
      builder: (context, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, _) => const HomeScreen()),
        GoRoute(path: '/health', builder: (_, _) => const HealthScreen()),
        GoRoute(path: '/pharmacy-finder', builder: (_, _) => const PharmacyFinderScreen()),
        GoRoute(path: '/orders', builder: (_, _) => const OrdersScreen()),
        GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
      ],
    ),
    GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, _) => const RegisterScreen()),
    GoRoute(path: '/pharmacy/:id', builder: (_, state) {
      final id = state.pathParameters['id'] ?? '';
      return id.isNotEmpty ? PharmacyDetailScreen(id: id) : const HomeScreen();
    }),
    GoRoute(path: '/product/:id', builder: (_, state) {
      final id = state.pathParameters['id'] ?? '';
      return id.isNotEmpty ? ProductDetailScreen(id: id) : const HomeScreen();
    }),
    GoRoute(path: '/cart', builder: (_, _) => const CartScreen()),
    GoRoute(path: '/order/:id', builder: (_, state) {
      final id = state.pathParameters['id'] ?? '';
      return id.isNotEmpty ? OrderDetailScreen(id: id) : const HomeScreen();
    }),
    GoRoute(path: '/prescription-upload', builder: (_, _) => const PrescriptionUploadScreen()),
    GoRoute(path: '/search', builder: (_, state) {
      final query = state.uri.queryParameters['q'] ?? '';
      return SearchScreen(initialQuery: query);
    }),
    GoRoute(path: '/category/:slug', builder: (_, state) {
      final slug = state.pathParameters['slug'] ?? '';
      return slug.isNotEmpty ? CategoryScreen(slug: slug) : const HomeScreen();
    }),
    GoRoute(path: '/loyalty', builder: (_, _) => const LoyaltyScreen()),
    GoRoute(path: '/refill-reminder', builder: (_, _) => const RefillReminderScreen()),
  ],
);
