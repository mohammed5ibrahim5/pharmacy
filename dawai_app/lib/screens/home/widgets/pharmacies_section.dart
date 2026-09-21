import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../models/pharmacy.dart';
import '../../../widgets/pharmacy_card.dart';
import '../../../shared/widgets/loading_widget.dart';

class PharmaciesSection extends StatefulWidget {
  final List<Pharmacy> pharmacies;
  final bool isLoading;
  final bool isWide;
  final double padding;

  const PharmaciesSection({
    super.key,
    required this.pharmacies,
    required this.isLoading,
    required this.isWide,
    required this.padding,
  });

  @override
  State<PharmaciesSection> createState() => _PharmaciesSectionState();
}

class _PharmaciesSectionState extends State<PharmaciesSection> {
  int _selectedPharmacyTab = 0;

  List<Pharmacy> get _filteredPharmacies {
    switch (_selectedPharmacyTab) {
      case 1:
        return List.from(widget.pharmacies)..sort((a, b) => b.rating.compareTo(a.rating));
      case 2:
        return widget.pharmacies.where((p) => p.deliveryAvailable).toList();
      case 3:
        return widget.pharmacies.where((p) => p.is24h).toList();
      default:
        return widget.pharmacies;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading || widget.pharmacies.isEmpty) {
      if (!widget.isLoading) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(top: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.symmetric(horizontal: widget.padding),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ShimmerBox(width: 160, height: 20),
                  SizedBox(height: 4),
                  ShimmerBox(width: 100, height: 14),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 175,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: EdgeInsets.symmetric(horizontal: widget.padding),
                itemCount: 4,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (context, i) => const SizedBox(width: 210, child: PharmacyCardShimmer()),
              ),
            ),
          ],
        ),
      );
    }

    final tabs = ['الأقرب إليك', 'الأعلى تقييماً', 'توصيل سريع', '24 ساعة'];
    final filtered = _filteredPharmacies;

    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.symmetric(horizontal: widget.padding),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'الصيدليات القريبة',
                  style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                TextButton(
                  onPressed: () => context.push('/pharmacy-finder'),
                  child: Text('الخريطة الحية', style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 36,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: widget.padding),
              itemCount: tabs.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final isSelected = _selectedPharmacyTab == i;
                return ChoiceChip(
                  label: Text(tabs[i], style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600)),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(color: isSelected ? Colors.white : AppColors.text),
                  onSelected: (selected) {
                    if (selected) setState(() => _selectedPharmacyTab = i);
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 175,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: EdgeInsets.symmetric(horizontal: widget.padding),
              itemCount: filtered.length > 6 ? 6 : filtered.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) {
                final p = filtered[i];
                return SizedBox(
                  width: 210,
                  child: PharmacyCard(
                    pharmacy: p,
                    onTap: () => context.push('/pharmacy/${p.id}'),
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
