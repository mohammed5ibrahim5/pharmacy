import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

class RefillReminderScreen extends StatefulWidget {
  const RefillReminderScreen({super.key});

  @override
  State<RefillReminderScreen> createState() => _RefillReminderScreenState();
}

class _RefillReminderScreenState extends State<RefillReminderScreen> {
  bool _enabled = true;
  int _daysBefore = 3;
  final List<Map<String, dynamic>> _medications = [
    {'name': 'ميتفورمين', 'dose': '500mg', 'frequency': 'مرتين يومياً', 'enabled': true},
    {'name': 'اميلو', 'dose': '10mg', 'frequency': 'مرة يومياً', 'enabled': true},
    {'name': 'فوليك أسيد', 'dose': '5mg', 'frequency': 'مرة يومياً', 'enabled': false},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      appBar: AppBar(
        title: Text('تذكير إعادة الطلب', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: AppColors.warningGradient,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: AppColors.accent.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)),
                    child: const Icon(Icons.notifications_active_rounded, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('تذكير تلقائي', style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
                        Text('سيتم إشعارك عند اقتراب موعد إعادة الطلب', style: GoogleFonts.tajawal(color: Colors.white.withValues(alpha: 0.9), fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Settings
            _buildSectionTitle('الإعدادات'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _cardDecoration(),
              // ListTile paints its background and ripple on the nearest
              // Material ancestor, so leaving it directly under this coloured
              // DecoratedBox puts the splash *behind* the card and it never
              // shows. A transparent Material here stops the colour from
              // swallowing the ink without changing how the card looks.
              child: Material(
                type: MaterialType.transparency,
                child: Column(
                  children: [
                    SwitchListTile(
                      title: Text('تفعيل التذكير', style: GoogleFonts.tajawal(fontWeight: FontWeight.w600)),
                      subtitle: Text('إشعارات قبل انتهاء الدواء', style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
                      value: _enabled,
                      onChanged: (v) => setState(() => _enabled = v),
                      activeThumbColor: AppColors.primary,
                      contentPadding: EdgeInsets.zero,
                    ),
                    const Divider(),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('مدة التذكير', style: GoogleFonts.tajawal(fontWeight: FontWeight.w600)),
                      subtitle: Text('تذكير قبل $_daysBefore أيام من انتهاء الجرعة', style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
                      trailing: Container(
                        decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), borderRadius: BorderRadius.circular(10)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove, size: 18),
                              color: AppColors.primary,
                              onPressed: _daysBefore > 1 ? () => setState(() => _daysBefore--) : null,
                            ),
                            Text('$_daysBefore', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 16)),
                            IconButton(
                              icon: const Icon(Icons.add, size: 18),
                              color: AppColors.primary,
                              onPressed: _daysBefore < 14 ? () => setState(() => _daysBefore++) : null,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Medications
            _buildSectionTitle('أدويتي'),
            const SizedBox(height: 12),
            ..._medications.asMap().entries.map((entry) {
              final i = entry.key;
              final m = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: _cardDecoration(),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: AppColors.primarySurfaceOf(context), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.medication_rounded, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(m['name'], style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 14)),
                          Text('${m['dose']} - ${m['frequency']}', style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
                        ],
                      ),
                    ),
                    Switch(
                      value: m['enabled'],
                      onChanged: (v) => setState(() => _medications[i]['enabled'] = v),
                      activeThumbColor: AppColors.primary,
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 16),
            // Add medication
            GestureDetector(
              onTap: () {
                _showAddMedicationDialog();
              },
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surfaceOf(context),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3), width: 1.5),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 8),
                    Text('إضافة دواء', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, color: AppColors.primary)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  void _showAddMedicationDialog() {
    final nameCtrl = TextEditingController();
    final doseCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('إضافة دواء', style: GoogleFonts.tajawal(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              decoration: InputDecoration(hintText: 'اسم الدواء', hintStyle: GoogleFonts.tajawal()),
              style: GoogleFonts.tajawal(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: doseCtrl,
              decoration: InputDecoration(hintText: 'الجرعة (مثلاً 500mg)', hintStyle: GoogleFonts.tajawal()),
              style: GoogleFonts.tajawal(),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('إلغاء', style: GoogleFonts.tajawal())),
          FilledButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                setState(() {
                  _medications.add({
                    'name': nameCtrl.text,
                    'dose': doseCtrl.text.isNotEmpty ? doseCtrl.text : 'غير محدد',
                    'frequency': 'حسب الحاجة',
                    'enabled': true,
                  });
                });
                Navigator.pop(ctx);
              }
            },
            child: Text('إضافة', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(title, style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.textOf(context)));
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: AppColors.surfaceOf(context),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.borderOf(context)),
      boxShadow: AppShadow.xs,
    );
  }
}
