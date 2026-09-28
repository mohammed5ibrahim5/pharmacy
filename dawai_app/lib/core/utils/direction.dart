import 'package:flutter/material.dart';

/// Icon for a trailing "next" affordance (a chevron at the end of a list row).
///
/// Flutter mirrors text and `AlignmentDirectional`/`PositionedDirectional`
/// offsets automatically, but it does *not* mirror raw `Icons.chevron_*`
/// glyphs — a disclosure arrow pointing left is correct in Arabic and wrong in
/// English, and vice versa. Resolve it against the ambient direction instead
/// of hardcoding one side.
IconData forwardIconOf(BuildContext context) =>
    Directionality.of(context) == TextDirection.rtl
        ? Icons.chevron_left_rounded
        : Icons.chevron_right_rounded;
