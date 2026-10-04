import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../config/theme.dart';
import '../../../providers/language_provider.dart';

class HealthTipsSection extends StatelessWidget {
  final double padding;

  const HealthTipsSection({super.key, required this.padding});

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageProvider>();
    final tips = [
      {'icon': Icons.water_drop_outlined, 'title': 'home_drink_water', 'desc': 'home_water_cups', 'color': AppColors.info},
      {'icon': Icons.bedtime_outlined, 'title': 'home_sleep_well', 'desc': 'home_sleep_hours', 'color': AppColors.secondary},
      {'icon': Icons.restaurant_outlined, 'title': 'home_healthy_eating', 'desc': 'home_fruit_vegetables', 'color': AppColors.success},
      {'icon': Icons.directions_walk_rounded, 'title': 'home_exercise', 'desc': 'home_exercise_minutes', 'color': AppColors.warning},
    ];
    return Padding(
      padding: EdgeInsets.fromLTRB(padding, 24, padding, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(lang.t('home_health_tips'), style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800)),
              TextButton(
                onPressed: () => context.push('/health'),
                child: Text(lang.t('home_view_all'), style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 100,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: tips.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (ctx, i) {
                final t = tips[i];
                final color = t['color'] as Color;
                return Container(
                  width: 150,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: color.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(t['icon'] as IconData, color: color, size: 26),
                      const Spacer(),
                      Text(lang.t(t['title'] as String), style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 13)),
                      Text(lang.t(t['desc'] as String), style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.textMutedOf(context))),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
