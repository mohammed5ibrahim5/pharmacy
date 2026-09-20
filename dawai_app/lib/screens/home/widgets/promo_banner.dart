import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/theme.dart';

class PromoBanner extends StatelessWidget {
  final VoidCallback onShopNow;

  const PromoBanner({super.key, required this.onShopNow});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              gradient: AppColors.heroGradient,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                  child: const Icon(Icons.waving_hand_rounded, color: Colors.white, size: 36),
                ),
                const SizedBox(height: 12),
                Text('أهلاً بيك في دوا!', style: GoogleFonts.tajawal(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('خصم ترحيبي خاص بيتك', style: GoogleFonts.tajawal(color: Colors.white.withValues(alpha: 0.85), fontSize: 14)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.accentSurface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.accent.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    children: [
                      Text('خصمك 15%', style: GoogleFonts.tajawal(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.accent)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.accent, width: 2, strokeAlign: BorderSide.strokeAlignInside),
                        ),
                        child: Text('DAWAI15', style: GoogleFonts.tajawal(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.accent, letterSpacing: 3)),
                      ),
                      const SizedBox(height: 8),
                      Text('على أول طلب لك', style: GoogleFonts.tajawal(fontSize: 13, color: AppColors.textMuted)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity, height: 48,
                  child: ElevatedButton(
                    onPressed: onShopNow,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: Text('ابدأ التسوق', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
