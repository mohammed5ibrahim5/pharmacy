import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

class _FakeAppState extends ChangeNotifier {
  final List<String> _items = [];
  List<String> get items => List.unmodifiable(_items);

  void addItem(String item) {
    _items.add(item);
    notifyListeners();
  }

  void removeItem(String item) {
    _items.remove(item);
    notifyListeners();
  }

  void clearItems() {
    _items.clear();
    notifyListeners();
  }
}

class _TestApp extends StatelessWidget {
  final _FakeAppState state;

  const _TestApp({required this.state});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<_FakeAppState>.value(
      value: state,
      child: MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: const Text('Pharmacy App')),
          body: Consumer<_FakeAppState>(
            builder: (context, state, _) {
              return state.items.isEmpty
                  ? const Center(child: Text('No items'))
                  : ListView(
                      children: state.items
                          .map((item) => ListTile(title: Text(item)))
                          .toList(),
                    );
            },
          ),
          floatingActionButton: Builder(
            builder: (context) => FloatingActionButton(
              onPressed: () {
                Provider.of<_FakeAppState>(context, listen: false)
                    .addItem('Paracetamol');
              },
              child: const Icon(Icons.add),
            ),
          ),
        ),
      ),
    );
  }
}

void main() {
  testWidgets('App renders without crashing', (WidgetTester tester) async {
    final state = _FakeAppState();
    await tester.pumpWidget(_TestApp(state: state));

    expect(find.text('Pharmacy App'), findsOneWidget);
    expect(find.text('No items'), findsOneWidget);
  });

  testWidgets('FAB adds item to list', (WidgetTester tester) async {
    final state = _FakeAppState();
    await tester.pumpWidget(_TestApp(state: state));

    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();

    expect(find.text('Paracetamol'), findsOneWidget);
    expect(find.text('No items'), findsNothing);
  });

  testWidgets('Multiple items display correctly', (WidgetTester tester) async {
    final state = _FakeAppState();
    await tester.pumpWidget(_TestApp(state: state));

    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();

    // Add same item again
    await tester.tap(find.byIcon(Icons.add));
    await tester.pumpAndSettle();

    expect(find.text('Paracetamol'), findsNWidgets(2));
  });

  testWidgets('State change clears items', (WidgetTester tester) async {
    final state = _FakeAppState();
    await tester.pumpWidget(_TestApp(state: state));

    state.addItem('Item 1');
    state.addItem('Item 2');
    await tester.pumpAndSettle();

    expect(find.text('Item 1'), findsOneWidget);
    expect(find.text('Item 2'), findsOneWidget);

    state.clearItems();
    await tester.pumpAndSettle();

    expect(find.text('No items'), findsOneWidget);
  });
}
