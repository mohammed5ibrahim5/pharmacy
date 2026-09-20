import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';

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
        SnackBar(
          content: Text('الرجاء إدخال عنوان التوصيل', style: GoogleFonts.tajawal()),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
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
            behavior: SnackBarBehavior.floating,
          ),
        );
        context.go('/orders');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('حدث خطأ: ${e.toString()}', style: GoogleFonts.tajawal()),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _ordering = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final isWide = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('سلة المشتريات', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        actions: [
          if (state.cart.isNotEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text('${state.cartCount} عناصر', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: AppColors.primary)),
              ),
            ),
        ],
      ),
      body: state.cart.isEmpty
          ? _buildEmptyState()
          : SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: isWide ? 60 : 16, vertical: 16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 800),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ...state.cart.map((item) => _buildCartItem(item, state)),
                    const SizedBox(height: 24),
                    Text('معلومات التوصيل', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    _buildAddressSection(),
                    const SizedBox(height: 16),
                    _buildNotesSection(),
                    const SizedBox(height: 24),
                    Text('طريقة الدفع', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    _buildPaymentSection(),
                    const SizedBox(height: 24),
                    _buildSummaryCard(state),
                    const SizedBox(height: 24),
                    _buildOrderButton(state),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: AppColors.primarySurface, shape: BoxShape.circle),
            child: const Icon(Icons.shopping_cart_outlined, size: 80, color: AppColors.primary),
          ),
          const SizedBox(height: 24),
          Text('السلة فارغة', style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.text)),
          const SizedBox(height: 8),
          Text('أضف بعض المنتجات إلى السلة للبدء', style: GoogleFonts.tajawal(color: AppColors.textMuted, fontSize: 16)),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () => context.go('/'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('تصفح المنتجات', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildCartItem(dynamic item, AppState state) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadow.sm,
      ),
      child: Row(
        children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(12)),
            child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(item.imageUrl!, fit: BoxFit.cover))
                : const Icon(Icons.medication, color: AppColors.primary, size: 36),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.productName, style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.text), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 8),
                Text('${item.price.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary)),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.remove, size: 20),
                  color: AppColors.error,
                  onPressed: () => state.updateQuantity(item.key, item.quantity - 1),
                ),
                Text('${item.quantity}', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.add, size: 20),
                  color: AppColors.primary,
                  onPressed: () => state.updateQuantity(item.key, item.quantity + 1),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressSection() {
    return TextField(
      controller: _addressCtrl,
      decoration: InputDecoration(
        hintText: 'أدخل عنوان التوصيل بالتفصيل...',
        prefixIcon: const Icon(Icons.location_on_outlined, color: AppColors.primary),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: AppColors.surface,
      ),
    );
  }

  Widget _buildNotesSection() {
    return TextField(
      controller: _noteCtrl,
      maxLines: 2,
      decoration: InputDecoration(
        hintText: 'ملاحظات إضافية للتوصيل (اختياري)...',
        prefixIcon: const Icon(Icons.notes, color: AppColors.secondary),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: AppColors.surface,
      ),
    );
  }

  Widget _buildPaymentSection() {
    return Row(
      children: [
        Expanded(
          child: _PaymentOption(
            title: 'كاش',
            icon: Icons.money,
            isSelected: _paymentMethod == 'cash',
            onTap: () => setState(() => _paymentMethod = 'cash'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _PaymentOption(
            title: 'محفظة إلكترونية',
            icon: Icons.account_balance_wallet,
            isSelected: _paymentMethod == 'wallet',
            onTap: () => setState(() => _paymentMethod = 'wallet'),
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryCard(AppState state) {
    final subtotal = state.cartTotal;
    const deliveryFee = 20.0;
    final total = subtotal + deliveryFee;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadow.sm,
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('المجموع الفرعي', style: GoogleFonts.tajawal(fontSize: 16, color: AppColors.textSecondary)),
              Text('${subtotal.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('رسوم التوصيل', style: GoogleFonts.tajawal(fontSize: 16, color: AppColors.textSecondary)),
              Text('${deliveryFee.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          const Divider(height: 24, thickness: 1),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('الإجمالي', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.text)),
              Text('${total.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.w900, color: AppColors.primary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderButton(AppState state) {
    return Container(
      width: double.infinity,
      height: 56,
      decoration: BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadow.primaryShadow(),
      ),
      child: ElevatedButton(
        onPressed: _ordering ? null : () => _placeOrder(state),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        child: _ordering
            ? const CircularProgressIndicator(color: Colors.white)
            : Text('إتمام الطلب', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentOption({required this.title, required this.icon, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primarySurface : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? AppColors.primary : AppColors.border, width: isSelected ? 2 : 1),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? AppColors.primary : AppColors.textMuted, size: 28),
            const SizedBox(height: 8),
            Text(title, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: isSelected ? AppColors.primary : AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
