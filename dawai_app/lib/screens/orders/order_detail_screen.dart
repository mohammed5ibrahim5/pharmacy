import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../core/utils/api_error.dart';
import '../../providers/language_provider.dart';
import '../../services/api_service.dart';
import '../../models/order.dart';
import '../../core/utils/format.dart';

class OrderDetailScreen extends StatefulWidget {
  final String id;
  const OrderDetailScreen({super.key, required this.id});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final ApiService _api = ApiService();
  bool _loading = true;
  OrderGroup? _order;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (mounted) setState(() => _loading = true);
    try {
      final order = await _api.getOrderById(widget.id);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
      if (order == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('لم يتم العثور على هذا الطلب.', style: GoogleFonts.tajawal()),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(friendlyError(e, fallback: 'تعذّر تحميل تفاصيل الطلب.'), style: GoogleFonts.tajawal()), backgroundColor: AppColors.error),
      );
    }
  }

  Widget _buildCard({required Widget child, required EdgeInsets padding}) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderOf(context)),
        boxShadow: AppShadow.sm,
      ),
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text('تفاصيل الطلب', style: GoogleFonts.tajawal())),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_order == null) {
      // Covers both "no such order" and "the fetch failed" — previously this
      // was a dead end with no way to try again.
      return Scaffold(
        appBar: AppBar(title: Text('تفاصيل الطلب', style: GoogleFonts.tajawal())),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: AppColors.errorSurfaceOf(context), shape: BoxShape.circle),
                child: const Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.error),
              ),
              const SizedBox(height: 16),
              Text('الطلب غير موجود', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 18)),
              const SizedBox(height: 8),
              Text('قد يكون الطلب مرتبطاً بحساب آخر أو حُذف.',
                  style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context)), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded, size: 20),
                label: Text('إعادة المحاولة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      );
    }

    final o = _order!;
    final statusColor = AppColors.getStatusColor(o.status);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('طلب #${shortId(o.id)}', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_forward_ios_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Status Stepper Card
            _buildCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: statusColor.withValues(alpha: 0.15), shape: BoxShape.circle),
                        child: Icon(_getStatusIcon(o.status), color: statusColor, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(context.watch<LanguageProvider>().statusLabel(o.status), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 16, color: statusColor)),
                          Text('تحديث مباشر حالة التوصيل', style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.textMutedOf(context))),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  // Progress Steps
                  _buildProgressStepper(o.status),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Courier Contact Card
            _buildCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.primarySurfaceOf(context),
                    child: Icon(Icons.two_wheeler_rounded, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('مندوب الصيدلية', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13)),
                        Text(o.status == 'shipped' ? 'جاري التوصيل الآن' : 'في انتظار التأكيد', style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.phone_rounded, color: AppColors.primary),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('جاري الاتصال بمندوب التوصيل...', style: GoogleFonts.tajawal())),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Order items
            _buildCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('المنتجات المطلوبة', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 12),
                  ...o.orders.map((item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.medication, color: AppColors.primary, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.product?.name ?? 'منتج', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text('الكمية: ${item.quantity}', style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.textMutedOf(context))),
                            ],
                          ),
                        ),
                        Text('${item.totalPrice.toStringAsFixed(0)} ج.م', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 14)),
                      ],
                    ),
                  )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressStepper(String currentStatus) {
    final steps = [
      {'status': 'pending', 'label': 'تأكيد الطلب'},
      {'status': 'confirmed', 'label': 'مراجعة الصيدلي'},
      {'status': 'shipped', 'label': 'جاري التوصيل'},
      {'status': 'delivered', 'label': 'تم التسليم'},
    ];

    int activeIdx = 0;
    if (currentStatus == 'confirmed') activeIdx = 1;
    if (currentStatus == 'shipped') activeIdx = 2;
    if (currentStatus == 'delivered') activeIdx = 3;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(steps.length, (i) {
        final isDone = i <= activeIdx;
        return Expanded(
          child: Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isDone ? AppColors.primary : AppColors.borderOf(context),
                  shape: BoxShape.circle,
                ),
                child: Icon(isDone ? Icons.check_rounded : Icons.circle_outlined, color: Colors.white, size: 16),
              ),
              const SizedBox(height: 6),
              Text(
                steps[i]['label']!,
                style: GoogleFonts.tajawal(
                  fontSize: 10,
                  fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
                  color: isDone ? AppColors.primary : AppColors.textMutedOf(context),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        );
      }),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'pending': return Icons.hourglass_top_rounded;
      case 'confirmed': return Icons.check_circle_outline;
      case 'shipped': return Icons.local_shipping_outlined;
      case 'delivered': return Icons.task_alt_rounded;
      default: return Icons.info_outline;
    }
  }
}
