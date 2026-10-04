import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/language_provider.dart';

/// Fallback for any location that does not match a route.
///
/// go_router's built-in error page renders like a stack trace, which is both
/// alarming and useless to an end user — especially with deep links coming
/// from notification taps or shared order URLs.
class NotFoundScreen extends StatelessWidget {
  final Uri uri;
  const NotFoundScreen({super.key, required this.uri});

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageProvider>();
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(title: Text(lang.t('not_found_title'), style: GoogleFonts.tajawal(fontWeight: FontWeight.bold))),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: AppColors.errorSurfaceOf(context), shape: BoxShape.circle),
                child: const Icon(Icons.explore_off_rounded, size: 48, color: AppColors.error),
              ),
              const SizedBox(height: 20),
              Text(lang.t('not_found_message'), style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(
                uri.toString(),
                style: GoogleFonts.tajawal(fontSize: 13, color: AppColors.textMutedOf(context)),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => context.go('/'),
                icon: const Icon(Icons.home_rounded, size: 20),
                label: Text(lang.t('not_found_home'), style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
