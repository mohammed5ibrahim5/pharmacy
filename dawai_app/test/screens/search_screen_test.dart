import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:dawai_app/providers/language_provider.dart';
import 'package:dawai_app/screens/search/search_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'test-anon-key',
    );
  });

  testWidgets('invalid search intent ends loading and shows an empty state', (
    tester,
  ) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => LanguageProvider(),
        child: const MaterialApp(home: SearchScreen()),
      ),
    );
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'the');
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 401));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('لا توجد نتائج'), findsOneWidget);
    expect(
      find.text('اكتب اسم دواء أو مادة فعالة أو عرضًا للبحث.'),
      findsOneWidget,
    );

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });

  testWidgets('submitting a query cancels its pending debounce', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => LanguageProvider(),
        child: const MaterialApp(home: SearchScreen()),
      ),
    );
    await tester.pump();

    await tester.enterText(find.byType(TextField), 'the');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.search));
    await tester.pump();

    final warning = find.text(
      'اكتب اسم دواء أو مادة فعالة أو عرضًا للبحث.',
    );
    expect(warning, findsOneWidget);

    await tester.pump(const Duration(milliseconds: 401));
    expect(warning, findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });
}
