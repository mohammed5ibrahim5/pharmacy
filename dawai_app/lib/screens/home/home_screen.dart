import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../services/update_service.dart';
import '../../models/pharmacy.dart';
import '../../models/product.dart';
import '../../models/category.dart';

import 'widgets/hero_header.dart';
import 'widgets/categories_section.dart';
import 'widgets/pharmacies_section.dart';
import 'widgets/products_section.dart';
import 'widgets/health_tips_section.dart';
import 'widgets/emergency_banner.dart';
import 'widgets/promo_banner.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchCtrl = TextEditingController();
  final stt.SpeechToText _speech = stt.SpeechToText();
  final ScrollController _scrollCtrl = ScrollController();
  final ScrollController _catScrollCtrl = ScrollController();

  List<Pharmacy> _pharmacies = [];
  List<Product> _products = [];
  List<Category> _categories = [];

  /// Products-per-category, fetched separately from [_products] so the badges
  /// stay accurate without pulling the whole catalog into memory.
  Map<String, int> _categoryCounts = {};
  bool _loading = true;
  bool _hasError = false;
  String _errorMsg = '';
  bool _listening = false;
  bool _showAnnouncement = true;
  bool _showWelcome = true;

  @override
  void initState() {
    super.initState();
    _loadData();
    _initSpeech();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _showWelcomePopup();
      UpdateService.checkForUpdates(context);
    });
  }

  @override
  void dispose() {
    // The State previously had no dispose() at all: three controllers leaked
    // on every navigation and, worse, an in-flight recognition session kept
    // the microphone hot after leaving the screen.
    _speech.cancel();
    _searchCtrl.dispose();
    _scrollCtrl.dispose();
    _catScrollCtrl.dispose();
    super.dispose();
  }

  /// Speech recognition is a nice-to-have; if the plugin cannot start (no
  /// service on the device, permission denied) we must degrade quietly rather
  /// than leave the mic icon stuck in its "listening" state.
  Future<void> _initSpeech() async {
    try {
      await _speech.initialize();
    } catch (_) {
      debugPrint('speech_to_text failed to initialize');
    }
  }

  void _showWelcomePopup() async {
    if (!_showWelcome) return;
    final prefs = await SharedPreferences.getInstance();
    final hasSeenWelcome = prefs.getBool('has_seen_welcome') ?? false;
    if (hasSeenWelcome) return;
    _showWelcome = false;
    if (!mounted) return;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: EdgeInsets.zero,
        content: PromoBanner(
          onShopNow: () {
            Navigator.pop(ctx);
            prefs.setBool('has_seen_welcome', true);
          },
        ),
      ),
    ).then((_) => prefs.setBool('has_seen_welcome', true));
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _hasError = false;
      _errorMsg = '';
    });
    try {
      final results = await Future.wait([
        _api.getPharmacies(),
        // ProductsSection draws at most 8 cards, so there is no reason to ask
        // for (and deserialize) the whole catalog on every home visit.
        _api.getProducts(limit: 12),
        _api.getCategories(),
        _api.getCategoryProductCounts(),
      ]);
      if (mounted) {
        setState(() {
          _pharmacies = results[0] as List<Pharmacy>;
          _products = results[1] as List<Product>;
          _categories = results[2] as List<Category>;
          _categoryCounts = results[3] as Map<String, int>;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _hasError = true;
          _errorMsg = 'فشل تحميل البيانات. تأكد من اتصال الإنترنت وحاول مرة أخرى.';
        });
      }
    }
  }

  void _search(String query) {
    if (query.trim().isNotEmpty) {
      context.push('/search?q=${Uri.encodeComponent(query.trim())}');
    }
  }

  Future<void> _startVoiceSearch() async {
    if (_listening) {
      await _speech.stop();
      if (mounted) setState(() => _listening = false);
      return;
    }

    // Initialize lazily here as well: initState's attempt may still be in
    // flight, or may have failed because the user denied the mic permission.
    try {
      final available = await _speech.initialize();
      if (!mounted) return;
      if (!available) {
        setState(() => _listening = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تعذّر الوصول إلى الميكروفون. تحقّق من إذن الميكروفون.',
                style: GoogleFonts.tajawal()),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
      setState(() => _listening = true);
      await _speech.listen(
        onResult: (result) {
          if (!result.finalResult) return;
          final words = result.recognizedWords;
          _searchCtrl.text = words;
          if (!mounted) {
            // The screen is gone: never leave the mic running.
            _speech.stop();
            return;
          }
          setState(() => _listening = false);
          _search(words);
        },
        listenOptions: stt.SpeechListenOptions(localeId: 'ar_EG'),
      );
    } catch (_) {
      if (mounted) {
        setState(() => _listening = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تعذّر إجراء البحث الصوتي.', style: GoogleFonts.tajawal()),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _searchByImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera, imageQuality: 70);
    if (picked != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(children: [
            const Icon(Icons.center_focus_strong, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text('جاري فحص صورة الدواء واستخراج التفاصيل...', style: GoogleFonts.tajawal()),
          ]),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  void _triggerEmergencySos() {
    showDialog(
      context: context,
      // The dialog's own context is named separately so the handler below can
      // still reach the State's context (guarded by `mounted`) after the route
      // has been popped.
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.errorSurfaceOf(context),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.emergency, color: AppColors.error, size: 24),
            ),
            const SizedBox(width: 10),
            Text('طوارئ الصيدليات 24/7', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Text(
          'سيتم توصيلك فوراً بالخط الساخن للصيدلية الأقرب إليك للتوصيل السريع وتأمين الأدوية الحرجة.',
          style: GoogleFonts.tajawal(fontSize: 14, height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: Text('إلغاء', style: GoogleFonts.tajawal(color: AppColors.textMutedOf(context))),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              // Android 11+ package-visibility rules make canLaunchUrl throw
              // or return false for tel: without a <queries> entry, so try to
              // dial first and only fall back when the platform refuses.
              final uri = Uri(scheme: 'tel', path: '16000');
              try {
                if (await launchUrl(uri)) return;
              } catch (_) {}
              if (mounted) context.push('/pharmacy-finder');
            },
            icon: const Icon(Icons.phone_in_talk, size: 18),
            label: Text('اتصال عاجل', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final isWide = w > 600;
    final padding = isWide ? 40.0 : 16.0;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.primary,
        child: _hasError
            ? _buildErrorState()
            : CustomScrollView(
                controller: _scrollCtrl,
                physics: const BouncingScrollPhysics(),
                slivers: [
            SliverToBoxAdapter(
              child: HeroHeader(
                onSearch: _search,
                onVoiceSearch: _startVoiceSearch,
                onImageSearch: _searchByImage,
                showAnnouncement: _showAnnouncement,
                onDismissAnnouncement: () => setState(() => _showAnnouncement = false),
                searchController: _searchCtrl,
                isListening: _listening,
                onEmergencySos: _triggerEmergencySos,
              ),
            ),
            SliverToBoxAdapter(
              child: CategoriesSection(
                categories: _categories,
                productCounts: _categoryCounts,
                isLoading: _loading,
                scrollCtrl: _catScrollCtrl,
                isWide: isWide,
                padding: padding,
              ),
            ),
            SliverToBoxAdapter(
              child: PharmaciesSection(
                pharmacies: _pharmacies,
                isLoading: _loading,
                isWide: isWide,
                padding: padding,
              ),
            ),
            SliverToBoxAdapter(child: _buildHowItWorksSection(padding)),
            SliverToBoxAdapter(
              child: ProductsSection(
                products: _products,
                isLoading: _loading,
                isWide: isWide,
                padding: padding,
              ),
            ),
            SliverToBoxAdapter(
              child: HealthTipsSection(
                padding: padding,
              ),
            ),
            SliverToBoxAdapter(child: _buildTestimonialsSection(padding)),
            SliverToBoxAdapter(
              child: EmergencyBanner(
                padding: padding,
              ),
            ),
            SliverToBoxAdapter(child: _buildTrustFeatures(padding)),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
              ],
            ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.errorSurfaceOf(context),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.wifi_off_rounded, color: AppColors.error, size: 48),
            ),
            const SizedBox(height: 20),
            Text(
              'عذراً، حدث خطأ',
              style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              _errorMsg,
              style: GoogleFonts.tajawal(fontSize: 14, color: AppColors.textSecondaryOf(context)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh, size: 20),
              label: Text('إعادة المحاولة', style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHowItWorksSection(double padding) {
    final steps = [
      {'icon': Icons.search_rounded, 'title': 'ابحث', 'desc': 'عن الدواء', 'color': AppColors.primary},
      {'icon': Icons.compare_arrows_rounded, 'title': 'قارن', 'desc': 'الأسعار', 'color': AppColors.accent},
      {'icon': Icons.shopping_cart_rounded, 'title': 'اطلب', 'desc': 'بضغطة زر', 'color': AppColors.secondary},
      {'icon': Icons.delivery_dining_rounded, 'title': 'استلم', 'desc': 'في بابك', 'color': AppColors.success},
    ];
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isSmall = MediaQuery.of(context).size.width < 380;

    if (isSmall) {
      return Container(
        margin: EdgeInsets.fromLTRB(padding, 20, padding, 0),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.borderOf(context)),
          boxShadow: isDark ? AppShadow.darkSm : AppShadow.sm,
        ),
        child: Column(
          children: [
            Text('كيف يعمل التطبيق؟', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w800, color: isDark ? AppColors.darkText : AppColors.textOf(context))),
            const SizedBox(height: 14),
            ...steps.asMap().entries.map((entry) {
              final s = entry.value;
              final isLast = entry.key == steps.length - 1;
              return Column(
                children: [
                  Row(
                    children: [
                      Container(width: 40, height: 40, decoration: BoxDecoration(color: (s['color'] as Color).withValues(alpha: 0.1), shape: BoxShape.circle), child: Icon(s['icon'] as IconData, color: s['color'] as Color, size: 20)),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(s['title'] as String, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 13, color: isDark ? AppColors.darkText : AppColors.textOf(context))),
                          Text(s['desc'] as String, style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.textMutedOf(context))),
                        ],
                      ),
                    ],
                  ),
                  if (!isLast) ...[
                    const SizedBox(height: 10),
                    Container(height: 1, margin: const EdgeInsetsDirectional.only(end: 52), decoration: BoxDecoration(gradient: LinearGradient(colors: [AppColors.primary.withValues(alpha: 0.2), AppColors.accent.withValues(alpha: 0.2)]))),
                    const SizedBox(height: 10),
                  ],
                ],
              );
            }),
          ],
        ),
      );
    }

    return Container(
      margin: EdgeInsets.fromLTRB(padding, 20, padding, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.borderOf(context)),
        boxShadow: isDark ? AppShadow.darkSm : AppShadow.sm,
      ),
      child: Column(
        children: [
          Text('كيف يعمل التطبيق؟', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? AppColors.darkText : AppColors.textOf(context))),
          const SizedBox(height: 4),
          Text('أربع خطوات بسيطة', style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textMutedOf(context))),
          const SizedBox(height: 20),
          Row(
            children: List.generate(steps.length * 2 - 1, (index) {
              if (index.isOdd) {
                return Expanded(child: Container(height: 2, margin: const EdgeInsets.symmetric(horizontal: 2), decoration: BoxDecoration(gradient: LinearGradient(colors: [AppColors.primary.withValues(alpha: 0.2), AppColors.accent.withValues(alpha: 0.2)]))));
              }
              final i = index ~/ 2;
              final s = steps[i];
              return Expanded(
                child: Column(children: [
                  Container(width: 50, height: 50, decoration: BoxDecoration(color: (s['color'] as Color).withValues(alpha: 0.1), shape: BoxShape.circle), child: Icon(s['icon'] as IconData, color: s['color'] as Color, size: 24)),
                  const SizedBox(height: 8),
                  Text(s['title'] as String, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 13, color: isDark ? AppColors.darkText : AppColors.textOf(context))),
                  Text(s['desc'] as String, style: GoogleFonts.tajawal(fontSize: 11, color: AppColors.textMutedOf(context))),
                ]),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildTestimonialsSection(double padding) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final reviews = [
      {'name': 'أحمد محمد', 'rating': 5.0, 'text': 'توصيل سريع جداً وأسعار معقولة. صار صيدليتي المفضلة!', 'avatar': 'أ'},
      {'name': 'سارة العلي', 'rating': 4.5, 'text': 'البحث بالصوت ممتاز وسهل الاستخدام. أنصح بالتطبيق.', 'avatar': 'س'},
      {'name': 'خالد الحربي', 'rating': 5.0, 'text': 'قارنت الأسعار ولقيت أرخص صيدلية في منطقتي. شكراً دوا!', 'avatar': 'خ'},
    ];
    return Padding(
      padding: EdgeInsets.fromLTRB(padding, 24, padding, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ماذا يقول مستخدمونا', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? AppColors.darkText : AppColors.textOf(context))),
          const SizedBox(height: 4),
          Text('آراء حقيقية من عملاء دوا', style: GoogleFonts.tajawal(fontSize: 13, color: AppColors.textMutedOf(context))),
          const SizedBox(height: 14),
          SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: reviews.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (ctx, i) {
                final r = reviews[i];
                return Container(
                  width: 280,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.borderOf(context)),
                    boxShadow: isDark ? AppShadow.darkSm : AppShadow.sm,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.primarySurfaceOf(context),
                            child: Text(r['avatar'] as String, style: GoogleFonts.tajawal(fontWeight: FontWeight.w800, color: AppColors.primary)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(r['name'] as String, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 13)),
                            Row(children: [
                              Icon(Icons.star_rounded, color: AppColors.warning, size: 16),
                              const SizedBox(width: 2),
                              Text('${r['rating']}', style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600)),
                            ]),
                          ])),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: Text(r['text'] as String, style: GoogleFonts.tajawal(fontSize: 12, color: AppColors.textSecondaryOf(context), height: 1.5)),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrustFeatures(double padding) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final items = [
      {'icon': Icons.verified_user_rounded, 'title': 'صيدليات مرخصة', 'desc': '100% معتمدة', 'color': AppColors.primary},
      {'icon': Icons.attach_money_rounded, 'title': 'أسعار منافسة', 'desc': 'قارن واختار', 'color': AppColors.accent},
      {'icon': Icons.delivery_dining_outlined, 'title': 'توصيل سريع', 'desc': 'لحد بابك', 'color': AppColors.secondary},
      {'icon': Icons.support_agent_outlined, 'title': 'دعم 24/7', 'desc': 'وتساب وخط ساخن', 'color': AppColors.success},
    ];
    return Padding(
      padding: EdgeInsets.fromLTRB(padding, 24, padding, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('لماذا دوا؟', style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800, color: isDark ? AppColors.darkText : AppColors.textOf(context))),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 2.4,
            children: items.map((item) => Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.borderOf(context)),
                boxShadow: isDark ? AppShadow.darkSm : AppShadow.sm,
              ),
              child: Row(children: [
                Container(width: 40, height: 40, decoration: BoxDecoration(color: (item['color'] as Color).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)), child: Icon(item['icon'] as IconData, color: item['color'] as Color, size: 22)),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(item['title'] as String, style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 12, color: isDark ? AppColors.darkText : AppColors.textOf(context))),
                  Text(item['desc'] as String, style: GoogleFonts.tajawal(fontSize: 10, color: AppColors.textMutedOf(context))),
                ])),
              ]),
            )).toList(),
          ),
        ],
      ),
    );
  }
}
