import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:dawai_app/services/api_service.dart';

/// A stand-in for PostgREST, so `getProductPage` is driven through the real
/// postgrest-dart parsing path rather than a mock of it.
///
/// The behaviour pinned here was found by replaying the client's own request
/// against the live project, and none of it is guessable:
///
///   * `Content-Range` only carries a total when `Prefer: count=exact` was
///     sent — without it the header reads `0-9/*` and the total is unknown.
///   * a partial page comes back as **206**, not 200. That is only a success
///     because `supabase_common.isSuccessStatusCode` is `200..299`; a client
///     demanding exactly 200 would break the moment the catalogue outgrew one
///     page.
///   * an `offset` past the end is **416** with `{"code":"PGRST103"}` in the
///     body — the body, not the status line, is what
///     `PostgrestException.code` ends up holding.
///
/// `TestWidgetsFlutterBinding` installs an `HttpOverrides` that answers every
/// request with 400, which is what lets `route_smoke_test` run with no backend
/// at all. Reaching a real socket here means stepping outside that override.
typedef _Reply = ({int status, String body, Map<String, String> headers});

late HttpServer _server;
late _Reply _reply;
Uri? _lastUri;
Map<String, String>? _lastHeaders;

const _row = '{"id":"p1","name":"بنادول","price":25.5,"is_available":true}';

void _replyWith(
  int status,
  String body, {
  Map<String, String> headers = const {},
}) {
  _reply = (status: status, body: body, headers: headers);
}

/// Runs [body] with the test binding's HTTP override out of the way.
///
/// The window has to cover *construction*, not just the call: `IOClient`
/// evaluates `HttpClient()` in its own constructor
/// (`http-1.6.0/lib/src/io_client.dart`), and that runs while
/// `Supabase.initialize` assembles the client chain. Building it outside the
/// window captures the 400-answering mock for good, and no amount of
/// per-request wrapping brings a real socket back afterwards.
///
/// `HttpOverrides.runZoned` is not an option here: its `createHttpClient`
/// receives a context, but constructing `HttpClient(context: ...)` consults
/// `HttpOverrides.current` again, which is the very scope that just called it
/// — infinite recursion. Nulling the global override for the duration of the
/// build is the way out. (`HttpOverrides` has a setter for `global` but no
/// getter, so the saved value comes from `current`.)
Future<T> _withRealSocket<T>(Future<T> Function() body) async {
  final saved = HttpOverrides.current;
  HttpOverrides.global = null;
  try {
    return await body();
  } finally {
    HttpOverrides.global = saved;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // ApiService reads `Supabase.instance.client` in a field initialiser, so it
  // cannot be built before the instance exists.
  late final ApiService api;

  setUpAll(() async {
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    unawaited(_server.forEach((req) async {
      _lastUri = req.uri;
      final captured = <String, String>{};
      req.headers.forEach((name, values) {
        captured[name.toLowerCase()] = values.join(',');
      });
      _lastHeaders = captured;
      final r = _reply;
      req.response.statusCode = r.status;
      r.headers.forEach(req.response.headers.set);
      req.response.write(r.body);
      await req.response.close();
    }));

    SharedPreferences.setMockInitialValues({});
    await _withRealSocket(() => Supabase.initialize(
          url: 'http://127.0.0.1:${_server.port}',
          publishableKey: 'test-anon-key',
        ));
    api = ApiService();
  });

  tearDownAll(() => _server.close(force: true));

  setUp(() {
    _lastUri = null;
    _lastHeaders = null;
  });

  test('asks PostgREST for the total, the offset window and a stable sort',
      () async {
    _replyWith(200, '[$_row]', headers: {'content-range': '0-0/1'});

    await api.getProductPage(categoryId: 'c1');

    final uri = _lastUri!;
    expect(uri.path, '/rest/v1/products');
    expect(uri.queryParameters['is_available'], 'eq.true');
    expect(uri.queryParameters['category_id'], 'eq.c1');
    // Two order params, comma-joined. The id tie-break is what stops a row
    // from falling between two pages or appearing twice.
    expect(uri.queryParameters['order'],
        'name.desc.nullslast,id.desc.nullslast');
    expect(uri.queryParameters['offset'], '0');
    expect(uri.queryParameters['limit'], '24');
    expect(_lastHeaders!['prefer'], contains('count=exact'));
  });

  test('carries the window through to page 2', () async {
    _replyWith(206, '[$_row]', headers: {'content-range': '24-24/30'});

    final page = await api.getProductPage(offset: 24, limit: 1);

    expect(_lastUri!.queryParameters['offset'], '24');
    expect(_lastUri!.queryParameters['limit'], '1');
    expect(page.total, 30);
  });

  test('a partial page (206) is read, not mistaken for a failure', () async {
    _replyWith(206, '[$_row]', headers: {'content-range': '0-0/30'});

    final page = await api.getProductPage();

    expect(page.total, 30, reason: 'the count must survive a 206');
    expect(page.products, hasLength(1));
    expect(page.products.first.name, 'بنادول');
    expect(page.products.first.price, 25.5);
  });

  test('the count is the whole filtered set, not the page', () async {
    _replyWith(200, '[$_row]', headers: {'content-range': '0-0/1500'});

    final page = await api.getProductPage();

    expect(page.total, 1500, reason: 'header said 1500, one row came back');
  });

  test('a window past the end ends the list instead of throwing', () async {
    // Rows were delisted between two pages, so the next offset is past the
    // end. Raising here would leave the screen re-requesting this forever.
    _replyWith(
      416,
      jsonEncode({
        'code': 'PGRST103',
        'details': 'An offset of 24 was requested, but there are only 10 rows.',
        'hint': null,
        'message': 'Requested range not satisfiable',
      }),
    );

    final page = await api.getProductPage(offset: 24);

    expect(page.products, isEmpty);
    // total == offset, so the screen's `loaded < total` test closes the list.
    expect(page.total, 24);
  });

  test('the numeric spelling of the same error is absorbed too', () async {
    _replyWith(416, jsonEncode({'code': '416', 'message': 'nope'}));

    final page = await api.getProductPage(offset: 48);

    expect(page.products, isEmpty);
    expect(page.total, 48);
  });

  test('a genuine query error still propagates', () async {
    // Guards the handler above from swallowing real failures: only a window
    // past the end means "the list is finished".
    _replyWith(
      400,
      jsonEncode({
        'code': 'PGRST100',
        'details': 'syntax error',
        'hint': null,
        'message': 'parse error',
      }),
    );

    await expectLater(
      api.getProductPage(),
      throwsA(isA<PostgrestException>()),
    );
  });
}
