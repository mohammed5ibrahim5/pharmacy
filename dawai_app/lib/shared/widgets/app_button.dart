import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';

enum ButtonType { primary, secondary, danger }

class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final ButtonType type;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? icon;

  const AppButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.type = ButtonType.primary,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final activeColor = isDark ? AppColors.primaryLight : AppColors.primary;

    final Widget textWidget = Text(
      text,
      style: GoogleFonts.tajawal(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: type == ButtonType.secondary ? activeColor : Colors.white,
      ),
    );

    final Widget content = isLoading
        ? SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: type == ButtonType.secondary ? activeColor : Colors.white,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 20,
                  color: type == ButtonType.secondary ? activeColor : Colors.white,
                ),
                const SizedBox(width: 8),
              ],
              textWidget,
            ],
          );

    BoxDecoration decoration;
    switch (type) {
      case ButtonType.primary:
        decoration = BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary, activeColor],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(AppRadius.md),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        );
        break;
      case ButtonType.secondary:
        decoration = BoxDecoration(
          color: Colors.transparent,
          border: Border.all(color: activeColor, width: 1.5),
          borderRadius: BorderRadius.circular(AppRadius.md),
        );
        break;
      case ButtonType.danger:
        decoration = BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(AppRadius.md),
        );
        break;
    }

    final button = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isLoading ? null : onPressed,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          decoration: onPressed == null
              ? decoration.copyWith(
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  border: null,
                  gradient: null,
                  boxShadow: [],
                )
              : decoration,
          alignment: Alignment.center,
          child: content,
        ),
      ),
    );

    if (isFullWidth) {
      return SizedBox(width: double.infinity, child: button);
    }
    return button;
  }
}
