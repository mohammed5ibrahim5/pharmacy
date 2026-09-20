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
import '../widgets/main_scaffold.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  routes: [
    ShellRoute(
      builder: (context, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/health', builder: (_, __) => const HealthScreen()),
        GoRoute(path: '/pharmacy-finder', builder: (_, __) => const PharmacyFinderScreen()),
        GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(path: '/pharmacy/:id', builder: (_, state) => PharmacyDetailScreen(id: state.pathParameters['id']!)),
    GoRoute(path: '/product/:id', builder: (_, state) => ProductDetailScreen(id: state.pathParameters['id']!)),
    GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),
    GoRoute(path: '/order/:id', builder: (_, state) => OrderDetailScreen(id: state.pathParameters['id']!)),
    GoRoute(path: '/prescription-upload', builder: (_, __) => const PrescriptionUploadScreen()),
    GoRoute(path: '/search', builder: (_, state) {
      final query = state.uri.queryParameters['q'] ?? '';
      return SearchScreen(initialQuery: query);
    }),
    GoRoute(path: '/category/:slug', builder: (_, state) => CategoryScreen(slug: state.pathParameters['slug']!)),
  ],
);
