import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../models/pharmacy.dart';
import '../config/theme.dart';
import '../shared/widgets/loading_widget.dart';
import '../shared/widgets/app_button.dart';

class PharmacyCard extends StatelessWidget {
  final Pharmacy pharmacy;
  final VoidCallback? onTap;

  const PharmacyCard({
    super.key,
    required this.pharmacy,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
        onTap: onTap ?? () => context.push('/pharmacy/${pharmacy.id}'),
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.border,
            ),
            boxShadow: isDark ? AppShadow.darkSm : AppShadow.sm,
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Logo
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(
                      imageUrl: pharmacy.logoUrl ?? '',
                      width: 80,
                      height: 80,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => const ShimmerBox(width: 80, height: 80),
                      errorWidget: (context, url, error) => Container(
                        width: 80,
                        height: 80,
                        color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                        child: Icon(
                          Icons.local_pharmacy,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                          size: 32,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  
                  // Details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                pharmacy.name,
                                style: GoogleFonts.tajawal(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.darkText : AppColors.text,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: pharmacy.isActive ? AppColors.successSurface : AppColors.errorSurface,
                                borderRadius: BorderRadius.circular(AppRadius.xs),
                              ),
                              child: Text(
                                pharmacy.isActive ? 'مفتوح' : 'مغلق',
                                style: GoogleFonts.tajawal(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: pharmacy.isActive ? AppColors.success : AppColors.error,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.location_on_outlined, size: 14, color: isDark ? AppColors.darkTextMuted : AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '${pharmacy.area ?? ''} ${pharmacy.address}',
                                style: GoogleFonts.tajawal(
                                  fontSize: 12,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Icon(Icons.star_rounded, size: 16, color: AppColors.rating),
                            const SizedBox(width: 4),
                            Text(
                              pharmacy.rating.toStringAsFixed(1),
                              style: GoogleFonts.tajawal(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            if (pharmacy.deliveryAvailable)
                              Row(
                                children: [
                                  Icon(Icons.delivery_dining, size: 16, color: AppColors.primary),
                                  const SizedBox(width: 4),
                                  Text(
                                    pharmacy.is24h ? 'توصيل 24 ساعة' : 'توصيل متاح',
                                    style: GoogleFonts.tajawal(
                                      fontSize: 11,
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Divider(height: 1),
              ),
              SizedBox(
                width: double.infinity,
                child: AppButton(
                  text: 'عرض المنتجات',
                  onPressed: () => context.push('/pharmacy/${pharmacy.id}'),
                  type: ButtonType.secondary,
                  isFullWidth: true,
                ),
              ),
            ],
          ),
        ),
    );
  }
}
