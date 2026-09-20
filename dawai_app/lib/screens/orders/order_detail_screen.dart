import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/order.dart';

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
    try {
      final orders = await _api.getMyOrders();
      if (mounted) {
        setState(() {
          _order = orders.where((o) => o.id == widget.id).firstOrNull;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Widget _buildCard({required Widget child, required EdgeInsets padding}) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
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
      return Scaffold(
        appBar: AppBar(title: Text('تفاصيل الطلب', style: GoogleFonts.tajawal())),
        body: Center(
          child: Text('الطلب غير موجود', style: GoogleFonts.tajawal(color: AppColors.textMuted)),
        ),
      );
    }

    final o = _order!;
    final statusColor = AppColors.getStatusColor(o.status);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('طلب #${o.id.substring(0, 8)}', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
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
                          Text(AppColors.getStatusLabel(o.status), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 16, color: statusColor)),
                          Text('تحديث مباشر حالة التوصيل', style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.textMuted)),
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
                  const CircleAvatar(
                    radius: 22,
                    backgroundColor: AppColors.primarySurface,
                    child: Icon(Icons.two_wheeler_rounded, color: AppColors.primary, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('مندوب الصيدلية: كابتن أحمد', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13)),
                        Text('يصل خلال 15 دقيقة تقريباً', style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.bold)),
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
                          decoration: BoxDecoration(color: AppColors.primarySurface, borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.medication, color: AppColors.primary, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.product?.name ?? 'منتج', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text('الكمية: ${item.quantity}', style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.textMuted)),
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
                  color: isDone ? AppColors.primary : AppColors.border,
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
                  color: isDone ? AppColors.primary : AppColors.textMuted,
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
