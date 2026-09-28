import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

class LoyaltyScreen extends StatelessWidget {
  const LoyaltyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundOf(context),
      appBar: AppBar(
        title: Text('نقاط الولاء', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                gradient: AppColors.heroGradient,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), shape: BoxShape.circle),
                    child: const Icon(Icons.star_rounded, size: 36, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  Text('نقاطك الحالية', style: GoogleFonts.tajawal(color: Colors.white.withValues(alpha: 0.9), fontSize: 14)),
                  const SizedBox(height: 4),
                  Text('0', style: GoogleFonts.tajawal(color: Colors.white, fontSize: 52, fontWeight: FontWeight.w900)),
                  Text('نقطة', style: GoogleFonts.tajawal(color: Colors.white.withValues(alpha: 0.9), fontSize: 16)),
                ],
              ),
            ),
            const SizedBox(height: 28),
            _buildSectionTitle(context, 'كيف تجمع النقاط؟'),
            const SizedBox(height: 12),
            _buildBenefitCard(context, Icons.shopping_cart_rounded, '1 نقطة لكل 10 ج.م صرف', 'مع كل طلب في التطبيق'),
            const SizedBox(height: 10),
            _buildBenefitCard(context, Icons.star_rounded, '5 نقاط إضافية', 'عند تقييم الصيدلية'),
            const SizedBox(height: 10),
            _buildBenefitCard(context, Icons.card_giftcard, 'نقاط مزدوجة', 'في عيد ميلادك'),
            const SizedBox(height: 28),
            _buildSectionTitle(context, 'كيف تستبدل النقاط؟'),
            const SizedBox(height: 12),
            _buildBenefitCard(context, Icons.money_off_rounded, '100 نقطة = 10 ج.م خصم', 'خصم مباشر على طلبك'),
            const SizedBox(height: 10),
            _buildBenefitCard(context, Icons.local_shipping_rounded, '50 نقطة = توصيل مجاني', 'لمرة واحدة'),
            const SizedBox(height: 28),
            _buildSectionTitle(context, 'مستويات الولاء'),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildLevelCard(context, Icons.star, 'برونزي', '0', AppColors.accent),
                const SizedBox(width: 10),
                _buildLevelCard(context, Icons.emoji_events, 'فضي', '200', AppColors.textMutedOf(context)),
                const SizedBox(width: 10),
                _buildLevelCard(context, Icons.emoji_events, 'ذهبي', '500', AppColors.accent),
              ],
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Align(
      alignment: AlignmentDirectional.centerEnd,
      child: Text(title, style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textOf(context))),
    );
  }

  Widget _buildBenefitCard(BuildContext context, IconData icon, String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surfaceOf(context),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderOf(context)),
        boxShadow: AppShadow.xs,
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.accentSurfaceOf(context), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 22, color: AppColors.accent),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textOf(context))),
                Text(subtitle, style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLevelCard(BuildContext context, IconData icon, String name, String points, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: AppColors.surfaceOf(context),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderOf(context)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 28, color: color),
            const SizedBox(height: 6),
            Text(name, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 12, color: AppColors.textOf(context))),
            Text('$points نقطة', style: GoogleFonts.tajawal(fontSize: 10, color: AppColors.textMutedOf(context))),
          ],
        ),
      ),
    );
  }
}
