import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../models/customer.dart';
import '../../providers/app_state.dart';

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
      if (mounted) setState(() => _loading = false);
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
                      onTap: () {},
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
                      subtitle: 'العربية',
                      onTap: () {},
                    ),
                    _buildSettingsItem(
                      icon: theme.brightness == Brightness.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                      title: 'المظهر',
                      subtitle: theme.brightness == Brightness.dark ? 'الوضع الداكن' : 'الوضع الفاتح',
                      onTap: () {},
                    ),
                    _buildSettingsItem(
                      icon: Icons.notifications_none_outlined,
                      title: 'الإشعارات',
                      subtitle: 'إدارة تفضيلات الإشعارات',
                      onTap: () {},
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
                      onTap: () {},
                    ),
                    _buildSettingsItem(
                      icon: Icons.support_agent_outlined,
                      title: 'اتصل بنا',
                      subtitle: 'نحن هنا لمساعدتك',
                      onTap: () {},
                    ),
                  ],
                ),
                
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      await _api.signOut();
                      if (mounted) {
                        context.read<AppState>().clearCart();
                        context.go('/');
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
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
                  Icon(Icons.person_outline, size: 80, color: theme.colorScheme.primary),
                  const SizedBox(height: 24),
                  Text('سجل دخولك لتتمكن من الوصول لملفك الشخصي وطلباتك', 
                    textAlign: TextAlign.center,
                    style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.push('/login'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text('تسجيل الدخول', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 60, 20, 30),
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
                backgroundImage: _profile?.avatarUrl != null ? NetworkImage(_profile!.avatarUrl!) : null,
                child: _profile?.avatarUrl == null
                    ? Text((_profile?.fullName ?? 'م')[0].toUpperCase(), style: GoogleFonts.tajawal(fontSize: 40, color: theme.colorScheme.primary, fontWeight: FontWeight.bold))
                    : null,
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
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, right: 8),
      child: Text(
        title,
        style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
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
            Icon(Icons.chevron_left_rounded, color: theme.iconTheme.color?.withValues(alpha: 0.5), size: 20),
          ],
        ),
      ),
    );
  }

  void _showEditDialog() {
    final nameCtrl = TextEditingController(text: _profile?.fullName ?? '');
    final phoneCtrl = TextEditingController(text: _profile?.phone ?? '');
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
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
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('إلغاء', style: GoogleFonts.tajawal())),
          ElevatedButton(
            onPressed: () async {
              await _api.updateProfile(fullName: nameCtrl.text.trim(), phone: phoneCtrl.text.trim());
              if (mounted) { Navigator.pop(ctx); _load(); }
            },
            child: Text('حفظ', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}
