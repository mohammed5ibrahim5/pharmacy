/// Display helpers shared across screens and services.
library;

/// Shortens an id for display in titles, invoices and filenames.
///
/// The model `fromJson`s default `id` to `''` when the backend omits it, and
/// [String.substring] throws a [RangeError] for anything shorter than the
/// requested window. Callers previously did `id.substring(0, 8)` directly,
/// which turned a missing id into a red screen, so length is checked here
/// instead. An empty id renders as `-` rather than as an empty label.
String shortId(String id, {int length = 8}) {
  if (id.isEmpty) return '-';
  return id.length <= length ? id : id.substring(0, length);
}
