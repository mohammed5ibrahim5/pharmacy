import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:dawai_app/shared/widgets/load_more_on_scroll.dart';

/// `LoadMoreOnScroll` is the single piece of plumbing every paged listing
/// shares, and its two failure modes are both silent: firing on every scroll
/// frame (which re-requests the same window in a loop) or never firing at all
/// (which leaves the list permanently short).
void main() {
  Widget wrap({required VoidCallback onLoadMore, double threshold = 400}) {
    return MaterialApp(
      home: LoadMoreOnScroll(
        onLoadMore: onLoadMore,
        threshold: threshold,
        child: ListView.builder(
          itemCount: 60,
          itemBuilder: (_, i) => SizedBox(height: 100, child: Text('item $i')),
        ),
      ),
    );
  }

  testWidgets('does not fire while the end is still far away', (tester) async {
    var calls = 0;
    await tester.pumpWidget(wrap(onLoadMore: () => calls++));

    // 60 * 100px of content, so a single screenful barely dents it.
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pump();

    expect(calls, 0);
  });

  testWidgets('fires once the end is within the threshold', (tester) async {
    var calls = 0;
    await tester.pumpWidget(wrap(onLoadMore: () => calls++));

    await tester.drag(find.byType(ListView), const Offset(0, -6000));
    await tester.pump();

    expect(calls, greaterThan(0));
  });

  testWidgets('keeps firing on later scrolls so paging can resume',
      (tester) async {
    var calls = 0;
    await tester.pumpWidget(wrap(onLoadMore: () => calls++));

    await tester.drag(find.byType(ListView), const Offset(0, -6000));
    await tester.pump();
    final first = calls;
    expect(first, greaterThan(0));

    // Appending rows does not itself emit a scroll notification, so paging
    // only resumes when the user moves again — the widget must still be live
    // for that, rather than having latched after the first call.
    await tester.drag(find.byType(ListView), const Offset(0, 300));
    await tester.pump();

    expect(calls, greaterThan(first));
  });

  testWidgets('ignores nested scrollables inside a card', (tester) async {
    var calls = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: LoadMoreOnScroll(
          onLoadMore: () => calls++,
          threshold: 400,
          child: ListView(
            children: [
              SizedBox(
                height: 120,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: List.generate(40, (i) => const SizedBox(width: 80)),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // Scrolls the inner horizontal strip only; the outer list does not move,
    // so no page may be requested for it.
    await tester.drag(find.byType(ListView).last, const Offset(-400, 0));
    await tester.pump();

    expect(calls, 0);
  });
}
