import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:dawai_app/main.dart';
import 'package:dawai_app/providers/app_state.dart';
import 'package:dawai_app/router/app_router.dart';

/// Every message the app sends through `debugPrint`, in order.
final List<String> _logged = <String>[];

/// The framework invariant checker refuses to end a test while a foundation
/// debug variable is still overridden, so the original has to go back. Captured
/// in `setUpAll`, restored in a `finally`.
late final void Function(String?, {int? wrapWidth}) _realDebugPrint;

void tearDownAll() {
  debugPrint = _realDebugPrint;
}

/// Walks every route in [appRouter] and asserts the tree builds cleanly.
///
/// This file replaces the stock `widget_test.dart` that `flutter create` ships,
/// which pumped a self-contained `_TestApp` counter sharing no code with the
/// real application: its "App renders without crashing" kept passing while real
/// screens were broken. It was deleted rather than kept — four tests of
/// `List.add`, `List.clear` and `notifyListeners` were costing a misleading
/// sense of coverage.
///
/// There is no backend (or device) here: the test binding answers HTTP with
/// 400, so screens are expected to fall back to their error/empty states.
/// What is *not* acceptable is an internal failure leaking through — hence
/// the `NoSuchMethodError` guard, which is exactly how the ordering bug in
/// `ApiService.getProducts`/`getPharmacies` (filters applied after `.order()`)
/// was caught: every filtered query threw at runtime while the screens
/// happily rendered "no results".
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    // Capture eagerly: a top-level variable would otherwise be initialised on
    // first *read*, which happens after the override is already in place.
    _realDebugPrint = debugPrint;

    // Skip the first-launch welcome dialog and keep prefs off the platform
    // channel.
    SharedPreferences.setMockInitialValues({'has_seen_welcome': true});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'test-anon-key',
    );
  });

  testWidgets('every route renders without internal errors', (tester) async {
    debugPrint = (String? message, {int? wrapWidth}) {
      if (message != null) _logged.add(message);
    };
    // The binding verifies foundation invariants at the end of the test body
    // itself — *before* tearDownAll — so the original must go back here.
    try {
      await tester.pumpWidget(MyApp(appState: AppState()));

      const routes = <String>[
        '/login',
        '/register',
        '/cart',
        '/orders',
        '/profile',
        '/loyalty',
        '/refill-reminder',
        '/prescription-upload',
        '/search',
        '/category/painkillers',
        '/pharmacy/00000000-0000-0000-0000-000000000000',
        '/product/00000000-0000-0000-0000-000000000000',
        '/order/00000000-0000-0000-0000-000000000000',
        '/health',
        '/pharmacy-finder',
        '/',
      ];

      for (final route in routes) {
        _logged.clear();
        appRouter.go(route);
        // Shimmer placeholders animate forever, so pumpAndSettle would never
        // return; advance a fixed amount instead.
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
        await tester.pump(const Duration(milliseconds: 400));

        expect(
          tester.takeException(),
          isNull,
          reason: 'unexpected exception while rendering "$route"',
        );
        expect(find.byType(MaterialApp), findsOneWidget, reason: route);

        final internalFailures =
            _logged.where((m) => m.contains('NoSuchMethodError')).toList();
        expect(
          internalFailures,
          isEmpty,
          reason: 'internal error while rendering "$route":\n'
              '${internalFailures.join('\n')}',
        );
      }

      // Unknown locations must land on the friendly 404 rather than
      // go_router's default page (which reads like a stack trace).
      _logged.clear();
      appRouter.go('/definitely/not/a/route');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
      expect(find.text('تعذّر العثور على الصفحة'), findsOneWidget);
      expect(tester.takeException(), isNull);
    } finally {
      debugPrint = _realDebugPrint;
    }

    // Dispose the tree first so MainScaffold cancels its periodic notification
    // poll and every screen releases its controllers — a pending timer would
    // otherwise fail the test at teardown.
    await tester.pumpWidget(const SizedBox());
    await tester.pump();
  });
}
