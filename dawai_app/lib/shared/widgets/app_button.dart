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
    final Widget textWidget = Text(
      text,
      style: GoogleFonts.tajawal(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: type == ButtonType.secondary ? AppColors.primary : Colors.white,
      ),
    );

    final Widget content = isLoading
        ? SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: type == ButtonType.secondary ? AppColors.primary : Colors.white,
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
                  color: type == ButtonType.secondary ? AppColors.primary : Colors.white,
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
          gradient: const LinearGradient(
            colors: [AppColors.primary, Color(0xFF00BFA5)], // Teal gradient
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(12),
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
          border: Border.all(color: AppColors.primary, width: 1.5),
          borderRadius: BorderRadius.circular(12),
        );
        break;
      case ButtonType.danger:
        decoration = BoxDecoration(
          color: Colors.red.shade600,
          borderRadius: BorderRadius.circular(12),
        );
        break;
    }

    final button = Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isLoading ? null : onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          decoration: onPressed == null ? decoration.copyWith(color: Colors.grey.shade400, border: null, gradient: null, boxShadow: []) : decoration,
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
