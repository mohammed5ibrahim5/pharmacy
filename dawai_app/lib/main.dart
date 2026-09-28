import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/supabase_config.dart';
import 'i18n/app_localizations.dart';
import 'providers/app_state.dart';
import 'providers/theme_provider.dart';
import 'providers/language_provider.dart';
import 'router/app_router.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: SupabaseConfig.url,
    publishableKey: SupabaseConfig.anonKey,
  );
  await NotificationService().init();

  // Both are local SharedPreferences reads (sub-millisecond). Awaiting them
  // here keeps the mutators from racing an in-flight load: dropping these
  // futures meant a late read could overwrite a cart item the user had
  // already added.
  final appState = AppState();
  await appState.loadCart();
  await appState.loadFavorites();

  runApp(MyApp(appState: appState));
}

class MyApp extends StatelessWidget {
  final AppState appState;
  const MyApp({super.key, required this.appState});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => LanguageProvider()),
        ChangeNotifierProvider.value(value: appState),
      ],
      child: Consumer2<ThemeProvider, LanguageProvider>(
        builder: (context, themeProvider, langProvider, _) {
          return MaterialApp.router(
            title: 'دوا',
            debugShowCheckedModeBanner: false,
            theme: themeProvider.currentTheme,
            routerConfig: appRouter,
            locale: langProvider.currentLocale,
            // AppLocalizations was shipped without being registered, so its
            // `of()` (which force-unwraps `Localizations.of`) would have
            // thrown on first use. It reads the same ar/en maps as
            // LanguageProvider, and `locale:` above is driven by that provider,
            // so both accessors stay in sync.
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('ar', 'EG'),
              Locale('en', 'US'),
            ],
          );
        },
      ),
    );
  }
}
