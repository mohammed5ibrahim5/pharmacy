import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../core/utils/api_error.dart';
import '../../providers/language_provider.dart';
import '../../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _api = ApiService();
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await _api.signIn(email: _emailCtrl.text.trim(), password: _passCtrl.text);
      if (mounted) context.go('/');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(friendlyError(
            e,
            fallback: context.read<LanguageProvider>().t('login_failed'),
            translate: context.read<LanguageProvider>().t,
          ), style: GoogleFonts.tajawal()),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final lang = context.watch<LanguageProvider>();
    
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        body: Stack(
          children: [
            // Background Gradient
            Container(
              height: MediaQuery.of(context).size.height * 0.45,
              decoration: const BoxDecoration(
                gradient: AppColors.heroGradient,
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 500),
                    child: Column(
                      children: [
                        // Logo & Title
                        Hero(
                          tag: 'app_logo',
                          child: Container(
                            width: 80, height: 80,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.local_pharmacy, size: 40, color: Colors.white),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(lang.t('login_title'), style: GoogleFonts.tajawal(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white)),
                        const SizedBox(height: 8),
                        Text(lang.t('login_subtitle'), style: GoogleFonts.tajawal(fontSize: 16, color: Colors.white.withValues(alpha: 0.9))),
                        const SizedBox(height: 32),
                        
                        // Floating Card
                        Container(
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : theme.cardColor,
                            borderRadius: BorderRadius.circular(24),
                            boxShadow: isDark ? AppShadow.darkLg : AppShadow.lg,
                            border: isDark ? Border.all(color: AppColors.darkBorder) : null,
                          ),
                          padding: const EdgeInsets.all(32),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                TextFormField(
                                  controller: _emailCtrl,
                                  textDirection: TextDirection.ltr,
                                  keyboardType: TextInputType.emailAddress,
                                  autofillHints: const [AutofillHints.email],
                                  style: GoogleFonts.tajawal(color: isDark ? AppColors.darkText : AppColors.textOf(context)),
                                  decoration: InputDecoration(
                                    hintText: lang.t('login_email_hint'),
                                    prefixIcon: Icon(Icons.email_outlined),
                                  ),
                                  validator: (v) {
                                    if (v == null || v.isEmpty) return lang.t('login_email_required');
                                    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                                    return emailRegex.hasMatch(v) ? null : lang.t('login_invalid_email');
                                  },
                                ),
                                const SizedBox(height: 20),
                                TextFormField(
                                  controller: _passCtrl,
                                  textDirection: TextDirection.ltr,
                                  obscureText: _obscure,
                                  autofillHints: const [AutofillHints.password],
                                  style: GoogleFonts.tajawal(color: isDark ? AppColors.darkText : AppColors.textOf(context)),
                                  decoration: InputDecoration(
                                    hintText: lang.t('login_password_hint'),
                                    prefixIcon: const Icon(Icons.lock_outline),
                                    suffixIcon: AnimatedSwitcher(
                                      duration: const Duration(milliseconds: 200),
                                      child: IconButton(
                                        key: ValueKey(_obscure),
                                        icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                                        onPressed: () => setState(() => _obscure = !_obscure),
                                      ),
                                    ),
                                  ),
                                  validator: (v) => v != null && v.length >= 6 ? null : lang.t('login_short_password'),
                                ),
                                const SizedBox(height: 12),
                                Align(
                                  alignment: AlignmentDirectional.centerStart,
                                  child: TextButton(
                                    onPressed: () async {
                                      if (_emailCtrl.text.trim().isEmpty) {
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                          content: Text(lang.t('login_enter_email_first'), style: GoogleFonts.tajawal()),
                                          backgroundColor: AppColors.warning,
                                        ));
                                        return;
                                      }
                                      try {
                                        await _api.resetPassword(_emailCtrl.text.trim());
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                            content: Text(lang.t('login_reset_sent'), style: GoogleFonts.tajawal()),
                                            backgroundColor: AppColors.success,
                                          ));
                                        }
                                      } catch (e) {
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                            content: Text(friendlyError(
                                              e,
                                              fallback: lang.t('login_reset_failed'),
                                              translate: lang.t,
                                            ), style: GoogleFonts.tajawal()),
                                            backgroundColor: AppColors.error,
                                          ));
                                        }
                                      }
                                    },
                                    child: Text(
                                      lang.t('login_forgot_password'),
                                      style: GoogleFonts.tajawal(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                Container(
                                  decoration: BoxDecoration(
                                    gradient: AppColors.primaryGradient,
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                  child: ElevatedButton(
                                    onPressed: _loading ? null : _login,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      shadowColor: Colors.transparent,
                                      padding: const EdgeInsets.symmetric(vertical: 16),
                                    ),
                                    child: _loading
                                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                                        : Text(lang.t('login_button'), style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                                  ),
                                ),
                                const SizedBox(height: 24),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text('${lang.t('login_no_account')} ', style: GoogleFonts.tajawal(fontSize: 14, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondaryOf(context))),
                                    GestureDetector(
                                      onTap: () => context.push('/register'),
                                      child: Text(lang.t('login_create_account'), style: GoogleFonts.tajawal(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 14)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                Center(
                                  child: TextButton(
                                    onPressed: () => context.go('/'),
                                    child: Text(lang.t('login_continue_guest'), style: GoogleFonts.tajawal(color: isDark ? AppColors.darkTextMuted : AppColors.textMutedOf(context), fontWeight: FontWeight.w600, fontSize: 14)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
