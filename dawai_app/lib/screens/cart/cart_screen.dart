import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../core/utils/api_error.dart';
import '../../core/utils/smart_product_search.dart';
import '../../providers/app_state.dart';
import '../../services/api_service.dart';
import '../../models/customer.dart';
import '../../providers/language_provider.dart';
import '../../services/cart_revalidation.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});
  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _addressCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  String _paymentMethod = 'cash_on_delivery';
  bool _ordering = false;
  CheckoutConfig? _checkoutConfig;
  bool _checkoutConfigFailed = false;
  List<ApprovedPrescription> _approvedPrescriptions = [];
  String? _selectedPrescriptionId;
  bool _loadingPrescriptions = false;
  bool _prescriptionsFailed = false;

  @override
  void initState() {
    super.initState();
    _loadCheckoutConfig();
    _loadApprovedPrescriptions();
  }

  Future<void> _loadCheckoutConfig() async {
    try {
      final config = await ApiService().getCheckoutConfig();
      if (mounted) setState(() => _checkoutConfig = config);
    } catch (_) {
      if (mounted) setState(() => _checkoutConfigFailed = true);
    }
  }

  @override
  void dispose() {
    _addressCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadApprovedPrescriptions() async {
    if (ApiService().currentUser == null) return;
    setState(() {
      _loadingPrescriptions = true;
      _prescriptionsFailed = false;
    });
    try {
      final prescriptions = await ApiService().getApprovedPrescriptions();
      if (!mounted) return;
      setState(() {
        _approvedPrescriptions = prescriptions;
        if (!_approvedPrescriptions.any(
          (prescription) => prescription.id == _selectedPrescriptionId,
        )) {
          _selectedPrescriptionId = null;
        }
        _loadingPrescriptions = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loadingPrescriptions = false;
          _prescriptionsFailed = true;
        });
      }
    }
  }

  Future<void> _placeOrder(AppState state) async {
    if (state.cart.isEmpty) return;
    final lang = context.read<LanguageProvider>();
    if (!state.isLoggedIn) {
      context.push('/login');
      return;
    }
    if (_checkoutConfig == null || !_checkoutConfig!.showCashOnDelivery) return;
    if (_addressCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            lang.t('cart_address_required'),
            style: GoogleFonts.tajawal(),
          ),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _ordering = true);
    try {
      final productIds = state.cart.map((item) => item.productId).toSet();
      final latestProducts = await ApiService().getProductsByIds(
        productIds.toList(),
      );
      if (!mounted) return;
      final validation = revalidateCart(state.cart, latestProducts);
      final priceChanges = state.refreshCartProducts(latestProducts);
      if (!mounted) return;
      if (priceChanges.isNotEmpty) {
        await _showPriceChanges(priceChanges, lang);
        if (!mounted) return;
      }
      if (validation.missingProducts.isNotEmpty) {
        _showCheckoutIssue(
          lang.t('cart_products_unavailable').replaceFirst(
            '{products}',
            validation.missingProducts.join(lang.isArabic ? '، ' : ', '),
          ),
        );
        return;
      }
      if (validation.stockIssues.isNotEmpty) {
        _showCheckoutIssue(
          lang.t('cart_stock_changed').replaceFirst(
            '{products}',
            validation.stockIssues
                .map((issue) => '${issue.productName} (${issue.available})')
                .join(lang.isArabic ? '، ' : ', '),
          ),
        );
        return;
      }

      if (priceChanges.isNotEmpty) return;

      if (state.cart.any((item) => item.requiresPrescription)) {
        await _loadApprovedPrescriptions();
        if (!mounted) return;
        if (_prescriptionsFailed) return;
        final matchingPrescriptions = _matchingPrescriptions(state);
        if (matchingPrescriptions.isEmpty) {
          final message = _approvedPrescriptions.isEmpty
              ? lang.t('cart_no_approved_rx')
              : lang.t('cart_no_matching_rx');
          _showCheckoutIssue(message);
          return;
        }
        if (!matchingPrescriptions.any(
          (prescription) => prescription.id == _selectedPrescriptionId,
        )) {
          setState(() => _selectedPrescriptionId = null);
          _showCheckoutIssue(lang.t('cart_select_matching_rx'));
          return;
        }
      }

      final items = state.cart.map((c) => {
        'product_id': c.productId,
        'pharmacy_id': c.pharmacyId,
        'quantity': c.quantity,
      }).toList();
      final prescriptionProductIds = state.cart
          .where((item) => item.requiresPrescription)
          .map((item) => item.productId)
          .toList();

      await ApiService().placeOrder(
        items: items,
        address: _addressCtrl.text.trim(),
        note: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
        paymentMethod: _paymentMethod,
        rxId: prescriptionProductIds.isEmpty ? null : _selectedPrescriptionId,
        rxProductIds:
            prescriptionProductIds.isEmpty ? null : prescriptionProductIds,
      );

      state.clearCart();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(lang.t('cart_order_success'), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
            backgroundColor: AppColors.success,
          ),
        );
        context.go('/orders');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              friendlyError(e, fallback: lang.t('cart_order_failed')),
              style: GoogleFonts.tajawal(),
            ),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _ordering = false);
    }
  }

  void _showCheckoutIssue(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.tajawal()),
        backgroundColor: AppColors.warning,
      ),
    );
  }

  Future<void> _showPriceChanges(
    List<CartPriceChange> changes,
    LanguageProvider lang,
  ) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(lang.t('cart_prices_changed')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lang.t('cart_prices_changed_hint')),
            const SizedBox(height: 12),
            ...changes.map(
              (change) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  '${change.productName}: ${change.oldPrice.toStringAsFixed(2)} → ${change.newPrice.toStringAsFixed(2)} ${lang.t('currency')}',
                  style: GoogleFonts.tajawal(fontWeight: FontWeight.w600),
                ),
              ),
            ),
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(lang.t('cart_review_updated_total')),
          ),
        ],
      ),
    );
  }

  Map<String, List<CartItem>> _groupByPharmacy(List<CartItem> items) {
    final map = <String, List<CartItem>>{};
    for (final item in items) {
      map.putIfAbsent(item.pharmacyId, () => []).add(item);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    if (state.cart.isEmpty) {
      // `/cart` is registered outside the ShellRoute, so this screen sits on
      // the root navigator with no bottom bar and no automatic back affordance.
      return Scaffold(
        backgroundColor: AppColors.backgroundOf(context),
        appBar: AppBar(title: Text(context.watch<LanguageProvider>().t('cart_title'), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold))),
        body: _buildEmptyState(),
      );
    }

    final grouped = _groupByPharmacy(state.cart);
    final subtotal = state.cartTotal;
    final config = _checkoutConfig;
    final deliveryFee = config == null
        ? 0.0
        : _calculateDeliveryFee(state, config, subtotal);
    final total = subtotal +
        deliveryFee +
        (config?.showCashOnDelivery == true
            ? config!.cashOnDeliveryFee
            : 0);
    final lang = context.watch<LanguageProvider>();

    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      appBar: AppBar(
        title: Text(lang.t('cart_title'), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primarySurfaceOf(context),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
                child:                 Text('${state.cartCount} ${lang.t('cart_products')}', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, color: AppColors.primary, fontSize: 13)),
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
                ...grouped.entries.map((entry) {
                  final pharmacyName = entry.value.first.pharmacyName ?? 'صيدلية غير معروفة';
                  return _buildPharmacyGroup(pharmacyName, entry.value, state);
                }),
                const SizedBox(height: 16),
                _buildSectionTitle(lang.t('cart_delivery_address')),
                const SizedBox(height: 10),
                _buildAddressField(),
                const SizedBox(height: 16),
                _buildSectionTitle(lang.t('cart_notes')),
                const SizedBox(height: 10),
                _buildNotesField(),
                const SizedBox(height: 16),
                if (state.cart.any((item) => item.requiresPrescription)) ...[
                  _buildPrescriptionSelection(state),
                  const SizedBox(height: 16),
                ],
                _buildSectionTitle(lang.t('cart_payment_method')),
                const SizedBox(height: 10),
                _buildPaymentOptions(config),
                const SizedBox(height: 16),
                _buildSummaryCard(subtotal, deliveryFee, total),
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    lang.t('cart_estimate_disclaimer'),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.tajawal(
                      fontSize: 12,
                      color: AppColors.textMutedOf(context),
                    ),
                  ),
                ),
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
    // Scrollable so long copy (and large OS font scales) cannot overflow the
    // viewport the way a bare centered Column does.
    return SingleChildScrollView(
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: MediaQuery.sizeOf(context).height - kToolbarHeight),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), shape: BoxShape.circle),
                child: const Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.primary),
              ),
              const SizedBox(height: 24),
              Text('السلة فارغة', style: AppTypography.h2(context)),
              const SizedBox(height: 8),
              Text('أضف بعض المنتجات للبدء في التسوق', style: AppTypography.body(context, color: AppColors.textMutedOf(context))),
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
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: AppTypography.h3(context));
  }

  Widget _buildPharmacyGroup(String pharmacyName, List<CartItem> items, AppState state) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.borderOf(context)),
        boxShadow: AppShadow.sm,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Pharmacy Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.primarySurfaceOf(context),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_pharmacy_rounded, size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(pharmacyName, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
                ),
                Text('${items.length} منتج', style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMutedOf(context))),
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
    final lang = context.watch<LanguageProvider>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: Row(
        children: [
          // Image
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppColors.primarySurfaceOf(context),
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
                Text(item.productName, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textOf(context)), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('${item.price.toStringAsFixed(0)} ${lang.t('currency')}', style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
                    const SizedBox(width: 6),
                    Text('× ${item.quantity}', style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
                    const SizedBox(width: 6),
                    Text('= ${(item.price * item.quantity).toStringAsFixed(0)} ${lang.t('currency')}', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
                  ],
                ),
                if (item.requiresPrescription) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.warningSurfaceOf(context),
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
                    color: AppColors.errorSurfaceOf(context),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: const Icon(Icons.delete_outline_rounded, size: 16, color: AppColors.error),
                ),
              ),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.backgroundOf(context),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.borderOf(context)),
                ),
                child: Column(
                  children: [
                    _qtyButton(Icons.add, AppColors.primary, () => state.updateQuantity(item.key, item.quantity + 1)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                      child: Text('${item.quantity}', style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700)),
                    ),
                    _qtyButton(Icons.remove, item.quantity <= 1 ? AppColors.textMutedOf(context) : AppColors.error, () {
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
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.borderOf(context)),
      ),
      child: TextField(
        controller: _addressCtrl,
        maxLines: 2,
        style: GoogleFonts.tajawal(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'المنطقة، الشارع، رقم المبنى، الدور...',
          hintStyle: GoogleFonts.tajawal(color: AppColors.textMutedOf(context), fontSize: 13),
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
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.borderOf(context)),
      ),
      child: TextField(
        controller: _noteCtrl,
        maxLines: 2,
        style: GoogleFonts.tajawal(fontSize: 14),
        decoration: InputDecoration(
          hintText: 'ملاحظات إضافية (اختياري)',
          hintStyle: GoogleFonts.tajawal(color: AppColors.textMutedOf(context), fontSize: 13),
          prefixIcon: const Icon(Icons.notes_outlined, color: AppColors.secondary, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildPaymentOptions(CheckoutConfig? config) {
    final lang = context.watch<LanguageProvider>();
    if (config == null && _checkoutConfigFailed) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            lang.t('cart_payment_config_error'),
            style: GoogleFonts.tajawal(color: AppColors.error),
          ),
          TextButton(
            onPressed: _loadCheckoutConfig,
            child: Text(lang.t('cart_refresh_rx')),
          ),
        ],
      );
    }
    if (config == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(12),
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }
    if (!config.showCashOnDelivery) {
      return Text(
        lang.t('cart_no_payment_methods'),
        style: GoogleFonts.tajawal(color: AppColors.error),
      );
    }
    return Row(
      children: [
        Expanded(
          child: _paymentTile(
            lang.t('cart_cash_on_delivery'),
            Icons.money_rounded,
            'cash_on_delivery',
          ),
        ),
      ],
    );
  }

  List<ApprovedPrescription> _matchingPrescriptions(AppState state) {
    final productNames = state.cart
        .where((item) => item.requiresPrescription)
        .map((item) => _normalizeMedicineName(item.productName))
        .where((name) => name.isNotEmpty)
        .toList();
    return _approvedPrescriptions.where((prescription) {
      final prescribedName = _normalizeMedicineName(
        prescription.drugName ?? '',
      );
      if (prescribedName.isEmpty || productNames.isEmpty) return false;
      return productNames.every(
        (productName) =>
            prescribedName == productName ||
            prescribedName.contains(productName) ||
            productName.contains(prescribedName),
      );
    }).toList();
  }

  String _normalizeMedicineName(String name) =>
      normalizeSearchText(name).replaceAll(' ', '');

  Widget _buildPrescriptionSelection(AppState state) {
    final lang = context.watch<LanguageProvider>();
    if (_loadingPrescriptions) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_prescriptionsFailed) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            lang.t('cart_load_rx_error'),
            style: GoogleFonts.tajawal(color: AppColors.error),
          ),
          TextButton(
            onPressed: _loadApprovedPrescriptions,
            child: Text(lang.t('cart_refresh_rx')),
          ),
        ],
      );
    }
    final matchingPrescriptions = _matchingPrescriptions(state);
    if (matchingPrescriptions.isEmpty) {
      final hasApprovedPrescriptions = _approvedPrescriptions.isNotEmpty;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            lang.t(
              hasApprovedPrescriptions
                  ? 'cart_no_matching_rx'
                  : 'cart_no_approved_rx',
            ),
            style: GoogleFonts.tajawal(color: AppColors.warning),
          ),
          if (!hasApprovedPrescriptions)
            TextButton.icon(
              onPressed: () async {
                await context.push('/prescription-upload');
                await _loadApprovedPrescriptions();
              },
              icon: const Icon(Icons.upload_file),
              label: Text(lang.t('prescription_submit')),
            ),
        ],
      );
    }
    return DropdownButtonFormField<String>(
      initialValue: _selectedPrescriptionId,
      decoration: InputDecoration(
        labelText: lang.t('cart_select_matching_rx'),
        border: const OutlineInputBorder(),
      ),
      items: matchingPrescriptions
          .map(
            (prescription) => DropdownMenuItem(
              value: prescription.id,
              child: Text(prescription.label),
            ),
          )
          .toList(),
      onChanged: (value) =>
          setState(() => _selectedPrescriptionId = value),
    );
  }

  Widget _paymentTile(String label, IconData icon, String method) {
    final selected = _paymentMethod == method;
    return GestureDetector(
      onTap: () => setState(() => _paymentMethod = method),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.primarySurfaceOf(context) : AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.borderOf(context),
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: selected ? AppColors.primary : AppColors.textMutedOf(context), size: 24),
            const SizedBox(height: 6),
            Text(label, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w700, color: selected ? AppColors.primary : AppColors.textSecondaryOf(context))),
          ],
        ),
      ),
    );
  }

  double _calculateDeliveryFee(
    AppState state,
    CheckoutConfig config,
    double subtotal,
  ) {
    if (config.freeDeliveryThreshold > 0 &&
        subtotal >= config.freeDeliveryThreshold) {
      return 0;
    }
    return state.cart
        .where((item) =>
            !item.forAllPharmacies &&
            item.pharmacyId.isNotEmpty &&
            item.deliveryAvailable != false)
        .fold<double>(
          0,
          (sum, item) =>
              sum +
              (item.deliveryFee != null && item.deliveryFee! > 0
                  ? item.deliveryFee!
                  : config.deliveryFee),
        );
  }

  Widget _buildSummaryCard(double subtotal, double deliveryFee, double total) {
    final lang = context.watch<LanguageProvider>();
    final currency = lang.t('currency');
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.borderOf(context)),
        boxShadow: AppShadow.sm,
      ),
      child: Column(
        children: [
          _summaryRow(lang.t('cart_subtotal'), '${subtotal.toStringAsFixed(0)} $currency'),
          const SizedBox(height: 10),
          _summaryRow(lang.t('cart_delivery_fee'), _checkoutConfig == null ? '—' : deliveryFee > 0 ? '${deliveryFee.toStringAsFixed(0)} $currency' : lang.t('cart_free')),
          const SizedBox(height: 10),
          _summaryRow(
            lang.t('cart_cash_fee'),
            _checkoutConfig == null
                ? '—'
                : _checkoutConfig!.showCashOnDelivery
                    ? '${_checkoutConfig!.cashOnDeliveryFee.toStringAsFixed(0)} $currency'
                    : '—',
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(lang.t('cart_estimated_total'), style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textOf(context))),
              Text(_checkoutConfig == null ? '—' : '${total.toStringAsFixed(0)} $currency', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primary)),
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
        Text(label, style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textSecondaryOf(context))),
        Text(value, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textOf(context))),
      ],
    );
  }

  Widget _buildBottomBar(double total, AppState state) {
    final lang = context.watch<LanguageProvider>();
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        border: Border(top: BorderSide(color: AppColors.borderOf(context))),
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
                Text(lang.t('cart_total'), style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
                Text(_checkoutConfig == null ? '—' : '${total.toStringAsFixed(0)} ${lang.t('currency')}', style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.primary)),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _ordering ||
                          _checkoutConfig == null ||
                          !_checkoutConfig!.showCashOnDelivery
                      ? null
                      : () => _placeOrder(state),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.textMutedOf(context),
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
                            Text(context.watch<LanguageProvider>().t('cart_place_order'), style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700)),
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
