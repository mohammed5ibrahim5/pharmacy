import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../widgets/dose_calculator_modal.dart';

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  final int _dosesTaken = 3;
  final int _dosesTotal = 4;

  double get _doseProgress => _dosesTotal > 0 ? _dosesTaken / _dosesTotal : 0.0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Container(
              padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 10, 20, 32),
              decoration: const BoxDecoration(
                gradient: AppColors.heroGradient,
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
              ),
              child: SafeArea(
                bottom: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 28),
                            ),
                            const SizedBox(width: 16),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'صحتي ومواعيدي',
                                  style: GoogleFonts.tajawal(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                                Text(
                                  'تتبع جرعاتك اليومية ودليلك الشامل',
                                  style: GoogleFonts.tajawal(
                                    fontSize: 13,
                                    color: Colors.white.withValues(alpha: 0.9),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.alarm_add_rounded, color: Colors.white, size: 28),
                          onPressed: () => context.push('/refill-reminder'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),
                    // Daily Progress Glass Card
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.25),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          // Progress ring
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 70,
                                height: 70,
                                child: CircularProgressIndicator(
                                  value: _doseProgress,
                                  strokeWidth: 8,
                                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              ),
                              Text(
                                '${(_doseProgress * 100).toInt()}%',
                                style: GoogleFonts.tajawal(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 20),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'جرعات اليوم',
                                  style: GoogleFonts.tajawal(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'تم أخذ $_dosesTaken من أصل $_dosesTotal جرعات اليوم',
                                  style: GoogleFonts.tajawal(color: Colors.white.withValues(alpha: 0.9), fontSize: 13),
                                ),
                                const SizedBox(height: 12),
                                GestureDetector(
                                  onTap: () => context.push('/refill-reminder'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      '+ إضافة تذكير دواء',
                                      style: GoogleFonts.tajawal(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Shortcut Actions
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _healthActionCard(
                          icon: Icons.notifications_active_rounded,
                          title: 'منبه الجرعات',
                          subtitle: 'تذكير ريفيل',
                          color: AppColors.primary,
                          theme: theme,
                          onTap: () => context.push('/refill-reminder'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _healthActionCard(
                          icon: Icons.warning_amber_rounded,
                          title: 'تفاعلات الدواء',
                          subtitle: 'فحص التداخلات',
                          color: AppColors.accentDark,
                          theme: theme,
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('فاحص التداخلات الدوائية نشط وتلقائي عند طلب أي دواء!', style: GoogleFonts.tajawal()),
                                backgroundColor: AppColors.accentDark,
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _healthActionCard(
                    icon: Icons.calculate_rounded,
                    title: 'حاسبة الجرعات',
                    subtitle: 'حسب الوزن والعمر',
                    color: AppColors.success,
                    theme: theme,
                    onTap: () => DoseCalculatorModal.show(context),
                    fullWidth: true,
                  ),
                ],
              ),
            ),
          ),
          
          // Articles Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              child: Text('مقالات صحية', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: theme.textTheme.titleLarge?.color)),
            ),
          ),

          // Health Articles List
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final article = _articles[index];
                  return _ArticleCard(
                    title: article['title']!,
                    category: article['category']!,
                    description: article['description']!,
                    icon: article['icon'] as IconData,
                    gradientColors: article['gradient'] as List<Color>,
                    theme: theme,
                  );
                },
                childCount: _articles.length,
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }

  Widget _healthActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required ThemeData theme,
    required VoidCallback onTap,
    bool fullWidth = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: theme.dividerColor.withValues(alpha: 0.5)),
          boxShadow: theme.brightness == Brightness.light ? AppShadow.sm : null,
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text(subtitle, style: GoogleFonts.tajawal(fontSize: 11, color: theme.textTheme.bodySmall?.color)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static final List<Map<String, dynamic>> _articles = [
    {
      'title': 'أهمية شرب الماء اليومي',
      'category': 'نصائح صحية',
      'description': 'يحتاج الجسم لتر ونصف إلى لترين من الماء يومياً لضمان الترطيب المناسب وتحسين وظائف الجسم الحيوية.',
      'icon': Icons.water_drop_outlined,
      'gradient': [const Color(0xFF06B6D4), const Color(0xFF22D3EE)],
    },
    {
      'title': 'أدوية خفض ضغط الدم',
      'category': 'أدوية',
      'description': 'دليل شامل عن أنواع أدوية ضغط الدم وآلية عملها والجرعات المعتادة وطرق التخزين الصحيحة.',
      'icon': Icons.medication_outlined,
      'gradient': [const Color(0xFF0D9488), const Color(0xFF14B8A6)],
    },
    {
      'title': 'إدارة مرض السكري',
      'category': 'أمراض مزمنة',
      'description': 'نصائح عملية للتعامل مع مرض السكري تشمل التغذية السليمة والنشاط البدني ومراقبة السكر.',
      'icon': Icons.bloodtype_outlined,
      'gradient': [const Color(0xFFEF4444), const Color(0xFFF87171)],
    },
  ];
}

class _ArticleCard extends StatelessWidget {
  final String title;
  final String category;
  final String description;
  final IconData icon;
  final List<Color> gradientColors;
  final ThemeData theme;

  const _ArticleCard({
    required this.title,
    required this.category,
    required this.description,
    required this.icon,
    required this.gradientColors,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.5)),
        boxShadow: theme.brightness == Brightness.light ? AppShadow.sm : null,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: gradientColors),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(category, style: GoogleFonts.tajawal(fontSize: 12, color: gradientColors[0], fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(description, style: GoogleFonts.tajawal(fontSize: 13, color: theme.textTheme.bodyMedium?.color, height: 1.5)),
        ],
      ),
    );
  }
}
