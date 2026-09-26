import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/order.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final ApiService _api = ApiService();
  List<OrderGroup> _orders = [];
  bool _loading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _hasError = false; });
    try {
      final orders = await _api.getMyOrders();
      if (mounted) setState(() { _orders = orders; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _hasError = true; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('طلباتي', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _hasError
              ? _buildErrorState()
              : _orders.isEmpty
                  ? _buildEmptyState()
                  : _buildOrdersList(),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(color: AppColors.errorSurface, shape: BoxShape.circle),
            child: const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.error),
          ),
          const SizedBox(height: 16),
          Text('فشل تحميل الطلبات', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('تحقق من الاتصال بالإنترنت', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _load,
            icon: const Icon(Icons.refresh, size: 20),
            label: Text('إعادة المحاولة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(color: AppColors.primarySurface, shape: BoxShape.circle),
              child: const Icon(Icons.receipt_long_rounded, size: 64, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            Text('ما في طلبات بعد', style: GoogleFonts.tajawal(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('ابدأ بالتسوق واطلب أدوية بكل سهولة', style: GoogleFonts.tajawal(color: AppColors.textMuted, fontSize: 14), textAlign: TextAlign.center),
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: () => context.go('/'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: Text('تصفح المنتجات', style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrdersList() {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _orders.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (ctx, i) => _OrderCard(order: _orders[i]),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderGroup order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final statusColor = AppColors.getStatusColor(order.status);
    final statusLabel = AppColors.getStatusLabel(order.status);
    final shortId = order.id.length > 8 ? order.id.substring(0, 8) : order.id;

    return InkWell(
      onTap: () => context.push('/order/${order.id}'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: AppShadow.sm,
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('طلب #$shortId', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 15, color: AppColors.text)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                  child: Text(statusLabel, style: GoogleFonts.tajawal(color: statusColor, fontWeight: FontWeight.w700, fontSize: 11)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.textMuted),
                const SizedBox(width: 6),
                Text(_formatDate(order.createdAt), style: GoogleFonts.tajawal(color: AppColors.textSecondary, fontSize: 13)),
                const SizedBox(width: 16),
                const Icon(Icons.inventory_2_outlined, size: 14, color: AppColors.textMuted),
                const SizedBox(width: 6),
                Text('${order.orders.length} ${order.orders.length == 1 ? 'منتج' : 'منتجات'}', style: GoogleFonts.tajawal(color: AppColors.textSecondary, fontSize: 13)),
              ],
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('الإجمالي', style: GoogleFonts.tajawal(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                Text('${order.totalPrice.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontWeight: FontWeight.w800, color: AppColors.primary, fontSize: 17)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
  }
}
