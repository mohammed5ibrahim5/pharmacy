import 'package:flutter/material.dart';

/// Calls [onLoadMore] whenever the vertical scrollable built directly
/// underneath comes within [threshold] of its end.
///
/// A `ScrollController` listener would need one controller per grid —
/// attached, detached and kept in sync as each screen moves between its
/// loading, error, empty and content states. A notification attaches to
/// whatever the screen is already rendering and needs no teardown.
class LoadMoreOnScroll extends StatelessWidget {
  const LoadMoreOnScroll({
    super.key,
    required this.onLoadMore,
    required this.threshold,
    required this.child,
  });

  final VoidCallback onLoadMore;

  /// How much scroll distance must remain. Measured in pixels, so it should
  /// be at least a viewport's worth: too small and the next page is fetched
  /// before the user can see the one that just arrived.
  final double threshold;

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        // depth 0 is the scrollable built directly below us; deeper ones are
        // horizontal strips inside cards and must not request a page.
        if (notification.depth == 0 &&
            notification.metrics.axis == Axis.vertical &&
            notification.metrics.extentAfter < threshold) {
          onLoadMore();
        }
        return false;
      },
      child: child,
    );
  }
}
