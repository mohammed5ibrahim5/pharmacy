import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/theme.dart';

class DoseCalculatorModal extends StatefulWidget {
  const DoseCalculatorModal({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const DoseCalculatorModal(),
    );
  }

  @override
  State<DoseCalculatorModal> createState() => _DoseCalculatorModalState();
}

class _DoseCalculatorModalState extends State<DoseCalculatorModal> {
  String? _selectedDrug;
  final _weightController = TextEditingController();
  final _ageController = TextEditingController();
  bool _calculated = false;

  Map<String, dynamic>? _result;

  final List<Map<String, String>> _drugs = [
    {'name': 'Paracetamol', 'ar': 'باراسيتامول', 'icon': '💊'},
    {'name': 'Ibuprofen', 'ar': 'إيبوبروفين', 'icon': '💊'},
    {'name': 'Amoxicillin', 'ar': 'أموكسيسيلين', 'icon': '💉'},
    {'name': 'Azithromycin', 'ar': 'أزيثرومايسن', 'icon': '💊'},
    {'name': 'Cetirizine', 'ar': 'سيتيريزين', 'icon': '💊'},
  ];

  @override
  void dispose() {
    _weightController.dispose();
    _ageController.dispose();
    super.dispose();
  }

  void _calculate() {
    final weight = double.tryParse(_weightController.text);
    final age = int.tryParse(_ageController.text);

    if (_selectedDrug == null || weight == null || age == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('يرجى ملء جميع الحقول', style: GoogleFonts.tajawal()),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    if (weight <= 0 || age <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('يرجى إدخال قيم صحيحة', style: GoogleFonts.tajawal()),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      _result = _computeDose(_selectedDrug!, weight, age);
      _calculated = true;
    });
  }

  Map<String, dynamic> _computeDose(String drug, double weight, int age) {
    switch (drug) {
      case 'Paracetamol':
        final singleDose = (weight * 15).clamp(60, 1000);
        final maxDaily = (weight * 60).clamp(240, 4000);
        return {
          'singleDose': singleDose.toStringAsFixed(0),
          'maxDaily': maxDaily.toStringAsFixed(0),
          'dosesPerDay': 4,
          'interval': '6 ساعات',
          'warning': age < 3
              ? 'يُنصح باستشارة الطبيب للأطفال تحت 3 سنوات'
              : 'لا تتجاوز الجرعة اليومية القصوى',
          'isCaution': age < 3,
        };

      case 'Ibuprofen':
        final singleDose = (weight * 10).clamp(50, 400);
        final maxDaily = (weight * 30).clamp(150, 1200);
        return {
          'singleDose': singleDose.toStringAsFixed(0),
          'maxDaily': maxDaily.toStringAsFixed(0),
          'dosesPerDay': 3,
          'interval': '8 ساعات',
          'warning': age < 6
              ? 'يُنصح باستشارة الطبيب للأطفال تحت 6 سنوات'
              : 'يُفضل تناوله بعد الطعام',
          'isCaution': age < 6,
        };

      case 'Amoxicillin':
        final singleDose = (weight * 25).clamp(125, 500);
        final maxDaily = (weight * 50).clamp(250, 3000);
        return {
          'singleDose': singleDose.toStringAsFixed(0),
          'maxDaily': maxDaily.toStringAsFixed(0),
          'dosesPerDay': 3,
          'interval': '8 ساعات',
          'warning': 'يجب إكمالورة العلاج كاملة حتى لو شعرت بالتحسن',
          'isCaution': false,
        };

      case 'Azithromycin':
        final singleDose = (weight * 10).clamp(50, 500);
        final maxDaily = singleDose;
        return {
          'singleDose': singleDose.toStringAsFixed(0),
          'maxDaily': singleDose.toStringAsFixed(0),
          'dosesPerDay': 1,
          'interval': '24 ساعة',
          'warning': 'يُؤخذ لمدة 3-5 أيام حسب وصف الطبيب',
          'isCaution': false,
        };

      case 'Cetirizine':
        final singleDose = weight >= 30 ? 10.0 : (weight * 0.25).clamp(2.5, 5);
        final maxDaily = singleDose;
        return {
          'singleDose': singleDose.toStringAsFixed(1),
          'maxDaily': singleDose.toStringAsFixed(1),
          'dosesPerDay': 1,
          'interval': '24 ساعة',
          'warning': age < 2
              ? 'يُنصح باستشارة الطبيب للأطفال تحت سنتين'
              : 'قد يسبب النعاس - يُفضل المساء',
          'isCaution': age < 2,
        };

      default:
        return {};
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(AppSpacing.xl),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: const Icon(
                      Icons.calculate_outlined,
                      color: AppColors.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'حاسبة جرع الأدوية',
                          style: GoogleFonts.tajawal(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppColors.text,
                          ),
                        ),
                        Text(
                          'لحساب الجرعة المناسبة حسب الوزن والعمر',
                          style: GoogleFonts.tajawal(
                            fontSize: 13,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'اختر الدواء',
                style: GoogleFonts.tajawal(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.text,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Container(
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedDrug,
                    hint: Text(
                      'اختر دواءً...',
                      style: GoogleFonts.tajawal(color: AppColors.textMuted),
                    ),
                    isExpanded: true,
                    dropdownColor: AppColors.surface,
                    items: _drugs.map((drug) {
                      return DropdownMenuItem(
                        value: drug['name'],
                        child: Row(
                          children: [
                            Text(drug['icon']!, style: const TextStyle(fontSize: 20)),
                            const SizedBox(width: AppSpacing.sm),
                            Text(
                              drug['ar']!,
                              style: GoogleFonts.tajawal(
                                fontSize: 15,
                                color: AppColors.text,
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedDrug = value),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'الوزن (كغ)',
                          style: GoogleFonts.tajawal(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        TextField(
                          controller: _weightController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: 'مثال: 20',
                            prefixIcon: const Icon(Icons.monitor_weight_outlined, size: 20),
                            hintStyle: GoogleFonts.tajawal(color: AppColors.textMuted),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'العمر (سنوات)',
                          style: GoogleFonts.tajawal(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        TextField(
                          controller: _ageController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: 'مثال: 5',
                            prefixIcon: const Icon(Icons.cake_outlined, size: 20),
                            hintStyle: GoogleFonts.tajawal(color: AppColors.textMuted),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _calculate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.calculate, color: Colors.white, size: 20),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        'احسب الجرعة',
                        style: GoogleFonts.tajawal(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              if (_calculated && _result != null) ...[
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: _result!['isCaution']
                        ? AppColors.warning.withValues(alpha: 0.08)
                        : AppColors.success.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(
                      color: _result!['isCaution']
                          ? AppColors.warning.withValues(alpha: 0.3)
                          : AppColors.success.withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Icon(
                            _result!['isCaution']
                                ? Icons.warning_amber_rounded
                                : Icons.check_circle_outline,
                            color: _result!['isCaution']
                                ? AppColors.warning
                                : AppColors.success,
                            size: 24,
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Text(
                            'نتيجة الحساب',
                            style: GoogleFonts.tajawal(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.text,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: AppSpacing.lg),
                      _buildResultRow(
                        'الجرعة الواحدة',
                        '${_result!['singleDose']} ملغ',
                        AppColors.primary,
                      ),
                      _buildResultRow(
                        'الجرعة اليومية القصوى',
                        '${_result!['maxDaily']} ملغ',
                        AppColors.accentDark,
                      ),
                      _buildResultRow(
                        'عدد الجرعات يومياً',
                        '${_result!['dosesPerDay']} مرات',
                        AppColors.accent,
                      ),
                      _buildResultRow(
                        'الفترة بين الجرعات',
                        _result!['interval'],
                        AppColors.primaryDark,
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: _result!['isCaution']
                              ? AppColors.warning.withValues(alpha: 0.1)
                              : AppColors.primary.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.info_outline,
                              size: 18,
                              color: _result!['isCaution']
                                  ? AppColors.warning
                                  : AppColors.primary,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                _result!['warning'],
                                style: GoogleFonts.tajawal(
                                  fontSize: 13,
                                  color: _result!['isCaution']
                                      ? AppColors.warning
                                      : AppColors.primary,
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(
                      color: AppColors.error.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.gpp_bad_outlined,
                        size: 18,
                        color: AppColors.error,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          'تنبيه: هذه الحسابات تقريبية ولا تُغني عن استشارة الطبيب أو الصيدلي. يُرجى مراجعة الجرعة الموصى بها على العبوة.',
                          style: GoogleFonts.tajawal(
                            fontSize: 12,
                            color: AppColors.error,
                            height: 1.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.xl),
            ],
          ),
        );
      },
    );
  }

  Widget _buildResultRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.tajawal(
              fontSize: 14,
              color: AppColors.textMuted,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.xs,
            ),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Text(
              value,
              style: GoogleFonts.tajawal(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
