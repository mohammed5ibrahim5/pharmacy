import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

class LoyaltyScreen extends StatelessWidget {
  const LoyaltyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('نقاط الولاء', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => context.pop(),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: AppColors.accentSurface,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.star_rounded, size: 64, color: AppColors.accent),
            ),
            const SizedBox(height: 24),
            Text(
              'نظام ولاء دوا',
              style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.text),
            ),
            const SizedBox(height: 8),
            Text(
              'اجمع نقاطك مع كل طلب واستبدلها بخصومات حصرية',
              style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textMuted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            _buildPointsCard(),
            const SizedBox(height: 32),
            _buildBenefitRow(Icons.add_circle_outline, '1 نقطة لكل 10 جنيه صرف'),
            const SizedBox(height: 12),
            _buildBenefitRow(Icons.redeem, '100 نقطة = خصم 10 جنيه'),
            const SizedBox(height: 12),
            _buildBenefitRow(Icons.card_giftcard, 'مكافآت عيد ميلاد مزدوجة'),
          ],
        ),
      ),
    );
  }

  Widget _buildPointsCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 32),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        children: [
          Text('نقاطك الحالية', style: GoogleFonts.tajawal(color: Colors.white.withValues(alpha: 0.9), fontSize: 14)),
          const SizedBox(height: 8),
          Text('0', style: GoogleFonts.tajawal(color: Colors.white, fontSize: 48, fontWeight: FontWeight.w900)),
          Text('نقطة', style: GoogleFonts.tajawal(color: Colors.white.withValues(alpha: 0.9), fontSize: 16)),
        ],
      ),
    );
  }

  static Widget _buildBenefitRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.accentSurface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: AppColors.accent),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(text, style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.text))),
        ],
      ),
    );
  }
}
