import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:dawai_app/providers/language_provider.dart';
import 'package:dawai_app/screens/health/health_screen.dart';

Future<void> pumpHealthScreen(WidgetTester tester) async {
  await tester.pumpWidget(
    ChangeNotifierProvider(
      create: (_) => LanguageProvider(),
      child: const MaterialApp(home: HealthScreen()),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('dose action clearly says calculation is unavailable', (
    tester,
  ) async {
    await pumpHealthScreen(tester);

    final doseAction = find.text('حاسبة الجرعات غير متاحة');
    expect(doseAction, findsOneWidget);
    expect(
      find.textContaining('لا تسجل الجرعات ولا ترسل تنبيهات تلقائية'),
      findsOneWidget,
    );
    await tester.ensureVisible(doseAction);
    await tester.tap(doseAction);
    await tester.pump();

    expect(
      find.textContaining('الجرعة تعتمد على الدواء وتركيزه والحالة الصحية'),
      findsOneWidget,
    );
  });

  testWidgets('interaction action does not claim automatic checking', (
    tester,
  ) async {
    await pumpHealthScreen(tester);

    expect(
      find.text('فاحص التداخلات الدوائية نشط وتلقائي عند طلب أي دواء!'),
      findsNothing,
    );
    final interactionAction = find.text('التداخلات الدوائية');
    expect(interactionAction, findsOneWidget);
    await tester.ensureVisible(interactionAction);
    await tester.tap(interactionAction);
    await tester.pump();

    expect(find.textContaining('لا يتوفر فحص آلي للتداخلات'), findsOneWidget);
  });
}
