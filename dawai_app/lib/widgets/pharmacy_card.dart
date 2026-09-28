import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../models/pharmacy.dart';
import '../config/theme.dart';
import '../shared/widgets/loading_widget.dart';

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
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.borderOf(context),
            ),
            boxShadow: isDark ? AppShadow.darkSm : AppShadow.sm,
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(
                      imageUrl: pharmacy.logoUrl ?? '',
                      width: 64,
                      height: 64,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => const ShimmerBox(width: 64, height: 64),
                      errorWidget: (context, url, error) => Container(
                        width: 64,
                        height: 64,
                        color: isDark ? AppColors.darkBorder : AppColors.borderLight,
                        child: Icon(
                          Icons.local_pharmacy,
                          color: isDark ? AppColors.darkTextMuted : AppColors.textMutedOf(context),
                          size: 28,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
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
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.darkText : AppColors.textOf(context),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: pharmacy.isActive ? AppColors.successSurfaceOf(context) : AppColors.errorSurfaceOf(context),
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
                            Icon(Icons.location_on_outlined, size: 12, color: isDark ? AppColors.darkTextMuted : AppColors.textSecondaryOf(context)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '${pharmacy.area ?? ''} ${pharmacy.address}',
                                style: GoogleFonts.tajawal(
                                  fontSize: 11,
                                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondaryOf(context),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.star_rounded, size: 14, color: AppColors.rating),
                            const SizedBox(width: 2),
                            Text(
                              pharmacy.rating.toStringAsFixed(1),
                              style: GoogleFonts.tajawal(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const Spacer(),
                            if (pharmacy.deliveryAvailable)
                              Row(
                                children: [
                                  Icon(Icons.delivery_dining, size: 14, color: AppColors.primary),
                                  const SizedBox(width: 2),
                                  Text(
                                    pharmacy.is24h ? '24 ساعة' : 'توصيل',
                                    style: GoogleFonts.tajawal(
                                      fontSize: 10,
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
            ],
          ),
        ),
    );
  }
}
