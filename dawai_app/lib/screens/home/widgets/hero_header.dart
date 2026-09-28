import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/theme.dart';

class _DotPatternPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = Colors.white;
    const spacing = 20.0;
    for (double x = 0; x < size.width; x += spacing) {
      for (double y = 0; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class HeroHeader extends StatelessWidget {
  final Function(String) onSearch;
  final VoidCallback onVoiceSearch;
  final VoidCallback onImageSearch;
  final bool showAnnouncement;
  final VoidCallback onDismissAnnouncement;
  final TextEditingController searchController;
  final bool isListening;
  final VoidCallback onEmergencySos;

  const HeroHeader({
    super.key,
    required this.onSearch,
    required this.onVoiceSearch,
    required this.onImageSearch,
    required this.showAnnouncement,
    required this.onDismissAnnouncement,
    required this.searchController,
    required this.isListening,
    required this.onEmergencySos,
  });

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final isWide = w > 600;
    final padding = isWide ? 40.0 : 16.0;

    return Column(
      children: [
        if (showAnnouncement)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: const BoxDecoration(gradient: AppColors.accentGradient),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.local_offer_rounded, color: Colors.white, size: 16),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'خصم 15% على أول طلب — استخدم كود: DAWAI15',
                    style: GoogleFonts.tajawal(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                    textAlign: TextAlign.center,
                  ),
                ),
                GestureDetector(
                  onTap: onDismissAnnouncement,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.close, color: Colors.white, size: 14),
                  ),
                ),
              ],
            ),
          ),
        Container(
          width: double.infinity,
          decoration: const BoxDecoration(
            gradient: AppColors.heroGradient,
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
          ),
          child: Stack(
            children: [
              Positioned(
                top: -40,
                right: -40,
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                bottom: 20,
                left: -30,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.05),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned.fill(
                child: Opacity(
                  opacity: 0.06,
                  child: CustomPaint(painter: _DotPatternPainter()),
                ),
              ),
              Padding(
                padding: EdgeInsets.fromLTRB(padding, 48, padding, 24),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                              ),
                              child: const Center(
                                child: Icon(Icons.local_pharmacy_rounded, color: Colors.white, size: 24),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'دوا - Dawai',
                                  style: GoogleFonts.tajawal(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  'أقرب صيدلية في خدمتك 24/7',
                                  style: GoogleFonts.tajawal(
                                    color: Colors.white.withValues(alpha: 0.85),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: onEmergencySos,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.error,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.error.withValues(alpha: 0.4),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                )
                              ],
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.emergency_rounded, color: Colors.white, size: 16),
                                const SizedBox(width: 4),
                                Text(
                                  'طوارئ',
                                  style: GoogleFonts.tajawal(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'ابحث عن دوائك واطلبه الآن\nمن أقرب صيدلية مرخصة',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.tajawal(
                        fontSize: isWide ? 28 : 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 20),
                    _buildSearchBar(context),
                    const SizedBox(height: 14),
                    _buildTrendingTags(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSearchBar(BuildContext context) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          const SizedBox(width: 8),
          IconButton(
            icon: Icon(
              isListening ? Icons.mic_rounded : Icons.mic_none_rounded,
              color: isListening ? AppColors.error : AppColors.primary,
            ),
            onPressed: onVoiceSearch,
          ),
          Expanded(
            child: TextField(
              controller: searchController,
              onSubmitted: onSearch,
              textAlign: TextAlign.start,
              style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textOf(context)),
              decoration: InputDecoration(
                hintText: 'ابحث باسم الدواء، الصيدلية أو المادة الفعالة...',
                hintStyle: GoogleFonts.tajawal(color: AppColors.textMutedOf(context), fontSize: 13),
                border: InputBorder.none,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(vertical: 16),
                prefixIcon: searchController.text.isNotEmpty
                    ? IconButton(
                        icon: Icon(Icons.clear, size: 18, color: AppColors.textMutedOf(context)),
                        onPressed: () {
                          searchController.clear();
                        },
                      )
                    : null,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.camera_alt_outlined, color: AppColors.secondary),
            onPressed: onImageSearch,
          ),
          const SizedBox(width: 4),
          Container(
            width: 46,
            height: 46,
            margin: const EdgeInsetsDirectional.only(start: 6),
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: BorderRadius.circular(16),
            ),
            child: IconButton(
              icon: const Icon(Icons.search_rounded, color: Colors.white, size: 22),
              onPressed: () => onSearch(searchController.text),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingTags() {
    final tags = ['بنادول اكسترا', 'كونجستال', 'أوميجا 3', 'فيتامين سي', 'سيتامول'];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          Icon(Icons.trending_up, size: 14, color: Colors.white.withValues(alpha: 0.7)),
          const SizedBox(width: 6),
          ...tags.map((t) => Padding(
            padding: const EdgeInsetsDirectional.only(start: 6),
            child: GestureDetector(
              onTap: () {
                searchController.text = t;
                onSearch(t);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Text(
                  t,
                  style: GoogleFonts.tajawal(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
            ),
          )),
        ],
      ),
    );
  }
}
