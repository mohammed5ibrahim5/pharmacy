import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ══════════════════════════════════════════════════════════════════════════════
// DAWAI DESIGN SYSTEM - Professional Pharmacy App Colors & Theme
// ══════════════════════════════════════════════════════════════════════════════

class AppColors {
  AppColors._();

  // ─── PRIMARY PALETTE (Teal - Trust, Health, Pharmacy) ────────────────────
  static const Color primary = Color(0xFF0D9488);        // Main teal
  static const Color primaryLight = Color(0xFF14B8A6);   // Lighter teal
  static const Color primaryDark = Color(0xFF0F766E);    // Darker teal
  static const Color primarySurface = Color(0xFFCCFBF1); // Very light teal bg
  static const Color primaryMuted = Color(0xFF99F6E4);   // Muted teal

  // ─── ACCENT PALETTE (Amber - Energy, Offers, Highlights) ─────────────────
  static const Color accent = Color(0xFFF59E0B);         // Main amber
  static const Color accentLight = Color(0xFFFBBF24);    // Lighter amber
  static const Color accentDark = Color(0xFFD97706);     // Darker amber
  static const Color accentSurface = Color(0xFFFEF3C7);  // Very light amber bg

  // ─── SECONDARY PALETTE (Indigo - Actions, Links) ─────────────────────────
  static const Color secondary = Color(0xFF6366F1);      // Main indigo
  static const Color secondaryLight = Color(0xFF818CF8); // Lighter indigo

  // ─── SEMANTIC COLORS ─────────────────────────────────────────────────────
  static const Color success = Color(0xFF10B981);        // Green - in stock, delivered
  static const Color successSurface = Color(0xFFD1FAE5); // Light green bg
  static const Color warning = Color(0xFFF59E0B);        // Amber - caution, prescription
  static const Color warningSurface = Color(0xFFFEF3C7); // Light amber bg
  static const Color error = Color(0xFFEF4444);          // Red - out of stock, delete
  static const Color errorSurface = Color(0xFFFEE2E2);   // Light red bg
  static const Color info = Color(0xFF3B82F6);           // Blue - info, links
  static const Color infoSurface = Color(0xFFDBEAFE);    // Light blue bg

  // ─── STATUS COLORS ───────────────────────────────────────────────────────
  static const Color inStock = Color(0xFF16A34A);
  static const Color outOfStock = Color(0xFFDC2626);
  static const Color rating = Color(0xFFFBBF24);
  static const Color whatsapp = Color(0xFF25D366);
  static const Color successLight = Color(0xFF6EE7B7); // lighter green border

  // ─── NEUTRAL PALETTE ─────────────────────────────────────────────────────
  // Backgrounds
  static const Color background = Color(0xFFF8FAFC);     // Main scaffold bg
  static const Color surface = Color(0xFFFFFFFF);        // Cards, sheets
  static const Color surfaceElevated = Color(0xFFFFFFFF); // Elevated cards

  // Text
  static const Color text = Color(0xFF0F172A);           // Primary text (slate-900)
  static const Color textSecondary = Color(0xFF475569);   // Secondary text (slate-600)
  static const Color textMuted = Color(0xFF94A3B8);       // Muted text (slate-400)
  static const Color textLight = Color(0xFFCBD5E1);       // Light text (slate-300)

  // Borders
  static const Color border = Color(0xFFE2E8F0);         // Default border (slate-200)
  static const Color borderLight = Color(0xFFF1F5F9);    // Light border (slate-100)
  static const Color borderFocus = Color(0xFF0D9488);    // Focus border

  // Dividers
  static const Color divider = Color(0xFFE2E8F0);

  // ─── DARK MODE PALETTE ───────────────────────────────────────────────────
  static const Color darkBackground = Color(0xFF0F172A);  // Dark main bg (slate-900)
  static const Color darkSurface = Color(0xFF1E293B);     // Dark cards (slate-800)
  static const Color darkSurfaceElevated = Color(0xFF334155); // Dark elevated (slate-700)
  static const Color darkText = Color(0xFFF1F5F9);        // Dark primary text
  static const Color darkTextSecondary = Color(0xFFCBD5E1); // Dark secondary text
  static const Color darkTextMuted = Color(0xFF64748B);    // Dark muted text
  static const Color darkBorder = Color(0xFF334155);       // Dark borders
  static const Color darkBorderLight = Color(0xFF1E293B);  // Dark light borders

  // ─── CATEGORY PALETTE ────────────────────────────────────────────────────
  static const Map<String, Color> categoryColors = {
    'medicines': Color(0xFF0D9488),
    'cosmetics': Color(0xFFEC4899),
    'baby-care': Color(0xFFF59E0B),
    'supplements': Color(0xFF10B981),
    'personal-care': Color(0xFF8B5CF6),
    'wellness': Color(0xFF06B6D4),
    'medical-devices': Color(0xFF3B82F6),
    'herbal': Color(0xFF22C55E),
    'vitamins': Color(0xFFF97316),
    'skincare': Color(0xFFD946EF),
    'haircare': Color(0xFFA855F7),
    'oral-care': Color(0xFF14B8A6),
    'sexual-health': Color(0xFFE11D48),
    'weight-management': Color(0xFFEF4444),
    'digestive-health': Color(0xFF84CC16),
    'first-aid': Color(0xFFDC2626),
    'home-essentials': Color(0xFF64748B),
  };

  static const Map<String, List<Color>> categoryGradients = {
    'medicines': [Color(0xFF0D9488), Color(0xFF14B8A6)],
    'cosmetics': [Color(0xFFEC4899), Color(0xFFF472B6)],
    'baby-care': [Color(0xFFF59E0B), Color(0xFFFBBF24)],
    'supplements': [Color(0xFF10B981), Color(0xFF34D399)],
    'personal-care': [Color(0xFF8B5CF6), Color(0xFFA78BFA)],
    'wellness': [Color(0xFF06B6D4), Color(0xFF22D3EE)],
    'medical-devices': [Color(0xFF3B82F6), Color(0xFF60A5FA)],
    'herbal': [Color(0xFF22C55E), Color(0xFF4ADE80)],
    'vitamins': [Color(0xFFF97316), Color(0xFFFB923C)],
    'skincare': [Color(0xFFD946EF), Color(0xFFE879F9)],
    'haircare': [Color(0xFFA855F7), Color(0xFFC084FC)],
    'oral-care': [Color(0xFF14B8A6), Color(0xFF2DD4BF)],
    'sexual-health': [Color(0xFFE11D48), Color(0xFFF43F5E)],
    'weight-management': [Color(0xFFEF4444), Color(0xFFF87171)],
    'digestive-health': [Color(0xFF84CC16), Color(0xFFA3E635)],
    'first-aid': [Color(0xFFDC2626), Color(0xFFEF4444)],
    'home-essentials': [Color(0xFF64748B), Color(0xFF94A3B8)],
  };

  static Color getCategoryColor(String slug) => categoryColors[slug] ?? primary;
  static List<Color> getCategoryGradient(String slug) => categoryGradients[slug] ?? [primary, primaryDark];

  // ─── GRADIENTS ───────────────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0D9488), Color(0xFF0F766E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF0D9488), Color(0xFF0F766E), Color(0xFF065F56)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient successGradient = LinearGradient(
    colors: [Color(0xFF10B981), Color(0xFF059669)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient errorGradient = LinearGradient(
    colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient warningGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ─── ORDER STATUS ────────────────────────────────────────────────────────
  static Color getStatusColor(String status) {
    switch (status) {
      case 'pending': return const Color(0xFFF59E0B);
      case 'confirmed': return const Color(0xFF3B82F6);
      case 'shipped': return const Color(0xFF8B5CF6);
      case 'delivered': return const Color(0xFF10B981);
      case 'cancelled': return const Color(0xFFEF4444);
      default: return const Color(0xFF64748B);
    }
  }

  static String getStatusLabel(String status) {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'confirmed': return 'تم التأكيد';
      case 'shipped': return 'في الطريق';
      case 'delivered': return 'تم التسليم';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SPACING SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
}

// ══════════════════════════════════════════════════════════════════════════════
// BORDER RADIUS SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class AppRadius {
  AppRadius._();
  static const double xs = 6;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double full = 999;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHADOW SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class AppShadow {
  AppShadow._();

  // Light mode shadows
  static List<BoxShadow> get xs => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 3, offset: const Offset(0, 1)),
  ];

  static List<BoxShadow> get sm => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 6, offset: const Offset(0, 2)),
  ];

  static List<BoxShadow> get md => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10, offset: const Offset(0, 4)),
  ];

  static List<BoxShadow> get lg => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 16, offset: const Offset(0, 6)),
  ];

  static List<BoxShadow> get xl => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.10), blurRadius: 24, offset: const Offset(0, 8)),
  ];

  // Colored shadows
  static List<BoxShadow> primaryShadow({double opacity = 0.15}) => [
    BoxShadow(color: AppColors.primary.withValues(alpha: opacity), blurRadius: 16, offset: const Offset(0, 6)),
  ];

  static List<BoxShadow> accentShadow({double opacity = 0.15}) => [
    BoxShadow(color: AppColors.accent.withValues(alpha: opacity), blurRadius: 16, offset: const Offset(0, 6)),
  ];

  // Dark mode shadows
  static List<BoxShadow> get darkSm => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 6, offset: const Offset(0, 2)),
  ];

  static List<BoxShadow> get darkMd => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.35), blurRadius: 10, offset: const Offset(0, 4)),
  ];

  static List<BoxShadow> get darkLg => [
    BoxShadow(color: Colors.black.withValues(alpha: 0.45), blurRadius: 16, offset: const Offset(0, 6)),
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

class AppTypography {
  AppTypography._();

  static TextStyle h1({Color? color}) => GoogleFonts.tajawal(
    fontSize: 28, fontWeight: FontWeight.w800, color: color ?? AppColors.text, height: 1.3,
  );

  static TextStyle h2({Color? color}) => GoogleFonts.tajawal(
    fontSize: 22, fontWeight: FontWeight.w800, color: color ?? AppColors.text, height: 1.3,
  );

  static TextStyle h3({Color? color}) => GoogleFonts.tajawal(
    fontSize: 18, fontWeight: FontWeight.w700, color: color ?? AppColors.text, height: 1.4,
  );

  static TextStyle body({Color? color}) => GoogleFonts.tajawal(
    fontSize: 14, fontWeight: FontWeight.w500, color: color ?? AppColors.textSecondary, height: 1.5,
  );

  static TextStyle caption({Color? color}) => GoogleFonts.tajawal(
    fontSize: 12, fontWeight: FontWeight.w500, color: color ?? AppColors.textMuted, height: 1.4,
  );

  static TextStyle button({Color? color}) => GoogleFonts.tajawal(
    fontSize: 14, fontWeight: FontWeight.w700, color: color ?? Colors.white, height: 1.3,
  );

  static TextStyle price({Color? color}) => GoogleFonts.tajawal(
    fontSize: 18, fontWeight: FontWeight.w800, color: color ?? AppColors.primary, height: 1.2,
  );

  static TextStyle badge({Color? color}) => GoogleFonts.tajawal(
    fontSize: 10, fontWeight: FontWeight.w700, color: color ?? Colors.white, height: 1.3,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════════════════════

class AppTheme {
  AppTheme._();

  static ThemeData get light {
    final textTheme = GoogleFonts.tajawalTextTheme();
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.accent,
        surface: AppColors.surface,
        error: AppColors.error,
        brightness: Brightness.light,
      ),
      scaffoldBackgroundColor: AppColors.background,
      textTheme: textTheme,

      // AppBar
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.text,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: true,
        titleTextStyle: GoogleFonts.tajawal(
          fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.text,
        ),
        iconTheme: const IconThemeData(color: AppColors.text),
      ),

      // Cards
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: const BorderSide(color: AppColors.border, width: 1),
        ),
      ),

      // Elevated Button
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.textMuted,
          disabledForegroundColor: Colors.white,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          textStyle: GoogleFonts.tajawal(
            fontSize: 14, fontWeight: FontWeight.w700,
          ),
        ),
      ),

      // Outlined Button
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          side: const BorderSide(color: AppColors.primary, width: 1.5),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          textStyle: GoogleFonts.tajawal(
            fontSize: 14, fontWeight: FontWeight.w700,
          ),
        ),
      ),

      // Text Button
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          textStyle: GoogleFonts.tajawal(
            fontSize: 14, fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Input Decoration
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.borderLight,
        hoverColor: AppColors.border,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg, vertical: AppSpacing.md,
        ),
        hintStyle: GoogleFonts.tajawal(
          color: AppColors.textMuted, fontSize: 14, fontWeight: FontWeight.w400,
        ),
      ),

      // Bottom Navigation
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
      ),

      // Divider
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),

      // Chip
      chipTheme: ChipThemeData(
        backgroundColor: AppColors.borderLight,
        selectedColor: AppColors.primary,
        disabledColor: AppColors.borderLight,
        labelStyle: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.full),
          side: const BorderSide(color: AppColors.border),
        ),
      ),

      // Snackbar
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.text,
        contentTextStyle: GoogleFonts.tajawal(
          fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        behavior: SnackBarBehavior.floating,
      ),

      // Bottom Sheet
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
    );
  }

  static ThemeData get dark {
    final textTheme = GoogleFonts.tajawalTextTheme(
      ThemeData.dark().textTheme,
    ).apply(
      bodyColor: AppColors.darkText,
      displayColor: AppColors.darkText,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        primary: AppColors.primaryLight,
        secondary: AppColors.accent,
        surface: AppColors.darkSurface,
        error: AppColors.error,
        brightness: Brightness.dark,
      ),
      scaffoldBackgroundColor: AppColors.darkBackground,
      textTheme: textTheme,

      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.darkSurface,
        foregroundColor: AppColors.darkText,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: true,
        titleTextStyle: GoogleFonts.tajawal(
          fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.darkText,
        ),
        iconTheme: const IconThemeData(color: AppColors.darkText),
      ),

      cardTheme: CardThemeData(
        color: AppColors.darkSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: const BorderSide(color: AppColors.darkBorder, width: 1),
        ),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryLight,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.darkTextMuted,
          disabledForegroundColor: AppColors.darkSurface,
          elevation: 0,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          textStyle: GoogleFonts.tajawal(
            fontSize: 14, fontWeight: FontWeight.w700,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primaryLight,
          side: const BorderSide(color: AppColors.primaryLight, width: 1.5),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          textStyle: GoogleFonts.tajawal(
            fontSize: 14, fontWeight: FontWeight.w700,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primaryLight,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          textStyle: GoogleFonts.tajawal(
            fontSize: 14, fontWeight: FontWeight.w600,
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.darkBorder,
        hoverColor: AppColors.darkBorderLight,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: const BorderSide(color: AppColors.primaryLight, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg, vertical: AppSpacing.md,
        ),
        hintStyle: GoogleFonts.tajawal(
          color: AppColors.darkTextMuted, fontSize: 14, fontWeight: FontWeight.w400,
        ),
      ),

      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.darkSurface,
        selectedItemColor: AppColors.primaryLight,
        unselectedItemColor: AppColors.darkTextMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w700),
        unselectedLabelStyle: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.w500),
      ),

      dividerTheme: const DividerThemeData(
        color: AppColors.darkBorder,
        thickness: 1,
        space: 1,
      ),

      chipTheme: ChipThemeData(
        backgroundColor: AppColors.darkBorder,
        selectedColor: AppColors.primaryLight,
        disabledColor: AppColors.darkBorder,
        labelStyle: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.full),
          side: const BorderSide(color: AppColors.darkBorder),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.darkSurfaceElevated,
        contentTextStyle: GoogleFonts.tajawal(
          fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.darkText,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        behavior: SnackBarBehavior.floating,
      ),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.darkSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),
    );
  }
}
