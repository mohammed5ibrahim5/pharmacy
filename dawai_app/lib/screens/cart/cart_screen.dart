import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';
import '../../models/customer.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _addressCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  String _paymentMethod = 'cash';
  bool _ordering = false;

  @override
  void dispose() {
    _addressCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _placeOrder(AppState state) async {
    if (state.cart.isEmpty) return;
    if (!state.isLoggedIn) {
      context.push('/login');
      return;
    }
    if (_addressCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('الرجاء إدخال عنوان التوصيل', style: GoogleFonts.tajawal()), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _ordering = true);
    try {
      final items = state.cart.map((c) => {
        'product_id': c.productId,
        'pharmacy_id': c.pharmacyId,
        'quantity': c.quantity,
      }).toList();

      await ApiService().placeOrder(
        items: items,
        address: _addressCtrl.text.trim(),
        note: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
        paymentMethod: _paymentMethod,
      );

      state.clearCart();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم تأكيد الطلب بنجاح!', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
            backgroundColor: AppColors.success,
          ),
        );
        context.go('/orders');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('حدث خطأ: ${e.toString()}', style: GoogleFonts.tajawal()), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _ordering = false);
    }
  }

  Map<String, List<CartItem>> _groupByPharmacy(List<CartItem> items) {
    final map = <String, List<CartItem>>{};
    for (final item in items) {
      final name = item.pharmacyName ?? 'صيدلية غير معروفة';
      map.putIfAbsent(name, () => []).add(item);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    if (state.cart.isEmpty) {
      return Scaffold(backgroundColor: AppColors.background, body: _buildEmptyState());
    }

    final grouped = _groupByPharmacy(state.cart);
    final subtotal = state.cartTotal;
    final deliveryFee = _calculateDeliveryFee(state);
    final total = subtotal + deliveryFee;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('سلة المشتريات', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child: Text('${state.cartCount} منتج', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, color: AppColors.primary, fontSize: 13)),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              children: [
                ...grouped.entries.map((entry) => _buildPharmacyGroup(entry.key, entry.value, state)),
                const SizedBox(height: 16),
                _buildSectionTitle('عنوان التوصيل'),
                const SizedBox(height: 10),
                _buildAddressField(),
                const SizedBox(height: 16),
                _buildSectionTitle('ملاحظات'),
                const SizedBox(height: 10),
                _buildNotesField(),
                const SizedBox(height: 16),
                _buildSectionTitle('طريقة الدفع'),
                const SizedBox(height: 10),
                _buildPaymentOptions(),
                const SizedBox(height: 16),
                _buildSummaryCard(subtotal, deliveryFee, total),
                const SizedBox(height: 100),
              ],
            ),
          ),
          _buildBottomBar(total, state),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(28),
              decoration: const BoxDecoration(color: AppColors.primarySurface, shape: BoxShape.circle),
              child: const Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.primary),
            ),
            const SizedBox(height: 24),
            Text('السلة فارغة', style: AppTypography.h2()),
            const SizedBox(height: 8),
            Text('أضف بعض المنتجات للبدء في التسوق', style: AppTypography.body(color: AppColors.textMuted)),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: () => context.go('/'),
              icon: const Icon(Icons.shopping_bag_outlined, size: 20),
              label: Text('تصفح المنتجات', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: AppTypography.h3());
  }

  Widget _buildPharmacyGroup(String pharmacyName, List<CartItem> items, AppState state) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadow.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Pharmacy Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_pharmacy_rounded, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(pharmacyName, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ),
                Text('${items.length} منتج', style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
              ],
            ),
          ),
          // Items
          ...items.map((item) => _buildCartItem(item, state)),
        ],
      ),
    );
  }

  Widget _buildCartItem(CartItem item, AppState state) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: Row(
        children: [
          // Image
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            clipBehavior: Clip.antiAlias,
            child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: item.imageUrl!,
                    fit: BoxFit.cover,
                    placeholder: (ctx, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                    errorWidget: (ctx, url, error) => const Icon(Icons.medication, color: AppColors.primary, size: 32),
                  )
                : const Icon(Icons.medication, color: AppColors.primary, size: 32),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.productName, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.text), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('${item.price.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
                    const SizedBox(width: 6),
                    Text('× ${item.quantity}', style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMuted)),
                    const SizedBox(width: 6),
                    Text('= ${(item.price * item.quantity).toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.text)),
                  ],
                ),
                if (item.requiresPrescription) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.warningSurface,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                    child: Text('روشتة', style: GoogleFonts.tajawal(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.warning)),
                  ),
                ],
              ],
            ),
          ),
          // Quantity Controls
          Column(
            children: [
              GestureDetector(
                onTap: () => state.removeFromCart(item.key),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.errorSurface,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: const Icon(Icons.delete_outline_rounded, size: 16, color: AppColors.error),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.background,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    _qtyButton(Icons.add, AppColors.primary, () => state.updateQuantity(item.key, item.quantity + 1)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                      child: Text('${item.quantity}', style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700)),
                    ),
                    _qtyButton(Icons.remove, item.quantity <= 1 ? AppColors.textMuted : AppColors.error, () {
                      if (item.quantity <= 1) {
                        state.removeFromCart(item.key);
                      } else {
                        state.updateQuantity(item.key, item.quantity - 1);
                      }
                    }),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _qtyButton(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(4),
        child: Icon(icon, size: 16, color: color),
      ),
    );
  }

  Widget _buildAddressField() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: TextField(
        controller: _addressCtrl,
        maxLines: 2,
        style: GoogleFonts.tajawal(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'المنطقة، الشارع، رقم المبنى، الدور...',
          hintStyle: GoogleFonts.tajawal(color: AppColors.textMuted, fontSize: 13),
          prefixIcon: const Icon(Icons.location_on_outlined, color: AppColors.primary, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildNotesField() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.border),
      ),
      child: TextField(
        controller: _noteCtrl,
        maxLines: 2,
        style: GoogleFonts.tajawal(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'ملاحظات إضافية (اختياري)',
          hintStyle: GoogleFonts.tajawal(color: AppColors.textMuted, fontSize: 13),
          prefixIcon: const Icon(Icons.notes_outlined, color: AppColors.secondary, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildPaymentOptions() {
    return Row(
      children: [
        Expanded(child: _paymentTile('كاش', Icons.money_rounded, 'cash')),
        const SizedBox(width: 12),
        Expanded(child: _paymentTile('محفظة', Icons.account_balance_wallet_rounded, 'wallet')),
        const SizedBox(width: 12),
        Expanded(child: _paymentTile('بطاقة', Icons.credit_card_rounded, 'card')),
      ],
    );
  }

  Widget _paymentTile(String label, IconData icon, String method) {
    final selected = _paymentMethod == method;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = method),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.primarySurface : AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: selected ? AppColors.primary : AppColors.textMuted, size: 24),
            const SizedBox(height: 6),
            Text(label, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? AppColors.primary : AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }

  double _calculateDeliveryFee(AppState state) {
    final uniquePharmacies = <String, double>{};
    for (final item in state.cart) {
      if (item.deliveryFee != null && item.deliveryFee! > 0 && !uniquePharmacies.containsKey(item.pharmacyId)) {
        uniquePharmacies[item.pharmacyId] = item.deliveryFee!;
      }
    }
    return uniquePharmacies.values.isEmpty ? 0 : uniquePharmacies.values.reduce((a, b) => a + b);
  }

  Widget _buildSummaryCard(double subtotal, double deliveryFee, double total) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadow.sm,
      ),
      child: Column(
        children: [
          _summaryRow('المجموع الفرعي', '${subtotal.toStringAsFixed(0)} ج.م'),
          const SizedBox(height: 10),
          _summaryRow('رسوم التوصيل', deliveryFee > 0 ? '${deliveryFee.toStringAsFixed(0)} ج.م' : 'مجاني'),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('الإجمالي', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text)),
              Text('${total.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textSecondary)),
        Text(value, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text)),
      ],
    );
  }

  Widget _buildBottomBar(double total, AppState state) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2)),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('الإجمالي', style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMuted)),
                Text('${total.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primary)),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _ordering ? null : () => _placeOrder(state),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.textMuted,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
                  ),
                  child: _ordering
                      ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.check_rounded, size: 20),
                            const SizedBox(width: 8),
                            Text('إتمام الطلب', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700)),
                          ],
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
