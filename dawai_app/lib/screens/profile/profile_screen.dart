import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../config/theme.dart';
import '../../core/utils/api_error.dart';
import '../../core/utils/direction.dart';
import '../../services/api_service.dart';
import '../../models/customer.dart';
import '../../providers/app_state.dart';
import '../../providers/theme_provider.dart';
import '../../providers/language_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _api = ApiService();
  Customer? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      if (_api.currentUser == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      final profile = await _api.getMyProfile();
      if (mounted) setState(() { _profile = profile; _loading = false; });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(friendlyError(e, fallback: 'تعذّر تحميل الملف الشخصي.'), style: GoogleFonts.tajawal()), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoggedIn = context.watch<AppState>().isLoggedIn;
    final theme = Theme.of(context);
    
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (!isLoggedIn) return _buildNotLoggedIn(theme);
    
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildHeader(theme)),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildSectionTitle('الحساب', theme),
                _buildCardGroup(
                  theme: theme,
                  children: [
                    _buildSettingsItem(
                      icon: Icons.person_outline,
                      title: 'تعديل الملف الشخصي',
                      subtitle: 'تحديث بياناتك الشخصية',
                      onTap: () => _showEditDialog(),
                    ),
                    _buildSettingsItem(
                      icon: Icons.location_on_outlined,
                      title: 'عناويني',
                      subtitle: 'إدارة عناوين التوصيل',
                      onTap: () => _showComingSoon('إدارة العناوين'),
                    ),
                  ],
                ),
                
                const SizedBox(height: 24),
                _buildSectionTitle('الميزات', theme),
                _buildCardGroup(
                  theme: theme,
                  children: [
                    _buildSettingsItem(
                      icon: Icons.receipt_long_outlined,
                      title: 'طلباتي',
                      subtitle: 'تتبع طلباتك السابقة',
                      onTap: () => context.go('/orders'),
                    ),
                    _buildSettingsItem(
                      icon: Icons.description_outlined,
                      title: 'روشتتي',
                      subtitle: 'إدارة الوصفات الطبية',
                      onTap: () => context.push('/prescription-upload'),
                    ),
                    _buildSettingsItem(
                      icon: Icons.star_outline_rounded,
                      title: 'نقاط الولاء',
                      subtitle: 'مكافآتك ونقاطك',
                      onTap: () => context.push('/loyalty'),
                    ),
                  ],
                ),
                
                const SizedBox(height: 24),
                _buildSectionTitle('الإعدادات', theme),
                _buildCardGroup(
                  theme: theme,
                  children: [
                    _buildSettingsItem(
                      icon: Icons.language_outlined,
                      title: 'اللغة',
                      subtitle: context.watch<LanguageProvider>().currentLanguageName,
                      onTap: () => context.read<LanguageProvider>().toggleLanguage(),
                    ),
                    _buildSettingsItem(
                      icon: theme.brightness == Brightness.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                      title: 'المظهر',
                      subtitle: theme.brightness == Brightness.dark ? 'الوضع الداكن' : 'الوضع الفاتح',
                      onTap: () => context.read<ThemeProvider>().toggleTheme(),
                    ),
                    _buildSettingsItem(
                      icon: Icons.notifications_none_outlined,
                      title: 'الإشعارات',
                      subtitle: 'إدارة تفضيلات الإشعارات',
                      onTap: () => _showComingSoon('إعدادات الإشعارات'),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
                _buildSectionTitle('المساعدة', theme),
                _buildCardGroup(
                  theme: theme,
                  children: [
                    _buildSettingsItem(
                      icon: Icons.help_outline,
                      title: 'مركز المساعدة',
                      subtitle: 'الأسئلة الشائعة والدعم',
                      onTap: () => _showComingSoon('مركز المساعدة'),
                    ),
                    _buildSettingsItem(
                      icon: Icons.support_agent_outlined,
                      title: 'اتصل بنا',
                      subtitle: 'نحن هنا لمساعدتك',
                      onTap: () => _showComingSoon('صفحة الاتصال'),
                    ),
                  ],
                ),
                
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _confirmLogout(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
                    ),
                    icon: const Icon(Icons.logout),
                    label: Text('تسجيل خروج', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 40),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotLoggedIn(ThemeData theme) {
    final isDark = theme.brightness == Brightness.dark;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.primarySurfaceOf(context),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.person_outline, size: 60, color: AppColors.primary),
                  ),
                  const SizedBox(height: 24),
                  Text('سجل دخولك لتتمكن من الوصول لملفك الشخصي وطلباتك', 
                    textAlign: TextAlign.center,
                    style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: isDark ? AppColors.darkText : AppColors.textOf(context)),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.push('/login'),
                      child: Text('تسجيل الدخول', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => context.push('/register'),
                      child: Text('إنشاء حساب جديد', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    final topPadding = MediaQuery.of(context).padding.top;
    return Container(
      padding: EdgeInsets.fromLTRB(20, topPadding + 10, 20, 30),
      decoration: const BoxDecoration(
        gradient: AppColors.heroGradient,
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(32)),
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.2),
              ),
              child: CircleAvatar(
                radius: 50,
                backgroundColor: theme.colorScheme.surface,
                child: _profile?.avatarUrl != null
                    ? ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: _profile!.avatarUrl!,
                          width: 100, height: 100, fit: BoxFit.cover,
                          placeholder: (ctx, url) => const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                          errorWidget: (ctx, url, error) => Text(
                            (_profile?.fullName ?? 'م').isNotEmpty ? (_profile?.fullName ?? 'م')[0] : 'م',
                            style: GoogleFonts.tajawal(fontSize: 40, color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                          ),
                        ),
                      )
                    : Text(
                        (_profile?.fullName ?? 'م').isNotEmpty ? (_profile?.fullName ?? 'م')[0] : 'م',
                        style: GoogleFonts.tajawal(fontSize: 40, color: theme.colorScheme.primary, fontWeight: FontWeight.bold),
                      ),
              ),
            ),
            const SizedBox(height: 16),
            Text(_profile?.fullName ?? 'عميل', style: GoogleFonts.tajawal(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 4),
            Text(_profile?.email ?? '', style: GoogleFonts.tajawal(fontSize: 14, color: Colors.white.withValues(alpha: 0.9))),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, ThemeData theme) {
    final isDark = theme.brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsetsDirectional.only(bottom: 12, end: 8),
      child: Text(
        title,
        style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondaryOf(context)),
      ),
    );
  }

  Widget _buildCardGroup({required ThemeData theme, required List<Widget> children}) {
    List<Widget> separatedChildren = [];
    for (int i = 0; i < children.length; i++) {
      separatedChildren.add(children[i]);
      if (i < children.length - 1) {
        separatedChildren.add(Divider(height: 1, indent: 56, color: theme.dividerColor.withValues(alpha: 0.5)));
      }
    }
    return Container(
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.5)),
        boxShadow: theme.brightness == Brightness.light ? AppShadow.sm : null,
      ),
      child: Column(
        children: separatedChildren,
      ),
    );
  }

  Widget _buildSettingsItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: theme.colorScheme.primary, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: GoogleFonts.tajawal(fontSize: 12, color: theme.textTheme.bodySmall?.color)),
                ],
              ),
            ),
            Icon(forwardIconOf(context), color: theme.iconTheme.color?.withValues(alpha: 0.5), size: 20),
          ],
        ),
      ),
    );
  }

  void _showComingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(children: [
          const Icon(Icons.info_outline, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Text('$feature قريباً إن شاء الله', style: GoogleFonts.tajawal()),
        ]),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
    );
  }

  void _confirmLogout() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.errorSurfaceOf(context),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.logout, color: AppColors.error, size: 22),
            ),
            const SizedBox(width: 10),
            Text('تسجيل خروج', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          'هل أنت متأكد من تسجيل الخروج؟',
          style: GoogleFonts.tajawal(fontSize: 14, color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondaryOf(context)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('إلغاء', style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context))),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await _api.signOut();
              if (mounted) {
                context.read<AppState>().clearCart();
                context.go('/');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: Text('تسجيل خروج', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showEditDialog() {
    final nameCtrl = TextEditingController(text: _profile?.fullName ?? '');
    final phoneCtrl = TextEditingController(text: _profile?.phone ?? '');
    bool saving = false;
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('تعديل الحساب', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, textDirection: TextDirection.rtl, style: GoogleFonts.tajawal(), decoration: const InputDecoration(labelText: 'الاسم', prefixIcon: Icon(Icons.person_outline))),
                const SizedBox(height: 16),
                TextField(controller: phoneCtrl, keyboardType: TextInputType.phone, textDirection: TextDirection.ltr, style: GoogleFonts.tajawal(), decoration: const InputDecoration(labelText: 'الموبايل', prefixIcon: Icon(Icons.phone_outlined))),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: saving ? null : () => Navigator.pop(ctx), child: Text('إلغاء', style: GoogleFonts.tajawal())),
            ElevatedButton(
              onPressed: saving ? null : () async {
                setDialogState(() => saving = true);
                try {
                  await _api.updateProfile(fullName: nameCtrl.text.trim(), phone: phoneCtrl.text.trim());
                  if (ctx.mounted) Navigator.pop(ctx);
                  if (mounted) _load();
                } catch (e) {
                  // Without this the exception escaped the tap handler and
                  // `saving` stayed true, leaving both buttons permanently
                  // disabled and the dialog impossible to close.
                  if (!ctx.mounted) return;
                  setDialogState(() => saving = false);
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(
                      content: Text('تعذّر حفظ التعديلات. تحقّق من الاتصال وحاول مرة أخرى.',
                          style: GoogleFonts.tajawal()),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              },
              child: saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('حفظ', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    ).whenComplete(() {
      nameCtrl.dispose();
      phoneCtrl.dispose();
    });
  }
}
