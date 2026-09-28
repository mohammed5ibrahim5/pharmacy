# dawai_app

Flutter mobile client for **Dawai** — find nearby pharmacies, compare prices,
upload prescriptions and order for delivery. Arabic-first with English support
(RTL), backed by Supabase.

```
lib/
  config/      theme.dart (design tokens), supabase_config.dart
  core/utils/  format.dart, api_error.dart, responsive.dart
  providers/   AppState (cart/favorites), ThemeProvider, LanguageProvider
  services/    api_service, cart_service, location_service, ...
  screens/     one folder per feature
  shared/      reusable widgets (AppButton, AppTextField, ...)
  router/      go_router route table
```

## Getting started

```powershell
cd dawai_app
flutter pub get
flutter run            # debug build on a connected device/emulator
flutter analyze        # must stay clean
flutter test           # must stay green
```

Backend configuration lives in `lib/config/supabase_config.dart` and can be
overridden at build time with `--dart-define`, though a compiled-in default is
present as a fallback.

## Tests

```powershell
flutter test           # all suites
flutter test test/route_smoke_test.dart
```

`test/route_smoke_test.dart` walks every entry in `lib/router/app_router.dart`
and asserts each screen builds without throwing and without an internal
`NoSuchMethodError` leaking into the log. There is no backend behind it (the
test binding answers HTTP with 400), so screens are expected to fall back to
their error or empty states — the guard is about *how* they fail.

Two real defects were found by it, which is why it exists:

- `ApiService.getProducts`/`getPharmacies` built filters *after* `.order()`.
  `order()` moves the builder to `PostgrestTransformBuilder`, which has no
  `.eq()`/`.or()`; the query was declared `dynamic`, so this compiled and then
  threw at runtime — every category, pharmacy and search filter silently
  returned nothing. Both are now typed `PostgrestFilterBuilder<PostgrestList>`,
  so the mistake is a compile error.
- `refill_reminder_screen` put its `ListTile`s directly under a coloured card
  `Container`, so their ripple painted behind the card and never showed.

`test/widgets/load_more_on_scroll_test.dart` covers the scroll trigger every
paged listing shares — it must not fire on every frame (which would re-request
the same window in a loop), must not latch after the first call (appending
rows emits no scroll notification, so paging would never resume), and must
ignore horizontal strips nested inside cards.

`test/widget_test.dart` is the stock Flutter counter demo: it pumps a
self-contained `_TestApp` that shares no code with this app, so its
"App renders without crashing" says nothing about the real screens. It is kept
only for the `_FakeAppState` list logic it exercises.

## Paging product lists

`ApiService.getProductPage()` returns one window of rows plus `total` — the
number matching the same filters. PostgREST derives `count` from the filters
and ignores `limit`/`offset`, so the total is free with the page; no second
round trip for the headers that print "N منتج" or the pharmacy tab's
"المنتجات (N)".

The category, search and pharmacy screens ask for `productPageSize` (24) rows
and append the next window when `LoadMoreOnScroll` sees the user within 600px
of the end.

Two details are load-bearing:

- **`order('name').order('id')`.** `name` repeats constantly in a pharmacy
  catalogue, and a sort key that does not totally order the rows lets a record
  equal to a page's last row fall between two pages — or appear twice — no
  matter how carefully the caller tracks its offset.
- **Server-side filters.** Category id, OTC flag, search text and pharmacy id
  all travel in the query. `category_screen` used to download every product in
  the catalogue to show one category, and its OTC switch re-ran `.where()` for
  every grid cell on every build.

`getProducts()` deliberately keeps a default `limit` of 200 for callers that
do not page: a call site that has not been taught to page should lose rows
slowly, not at 24.

## Release builds

```powershell
flutter build apk --release
```

### Release signing (required)

Release artifacts are signed with a keystore that is **not** committed to the
repository. `android/app/build.gradle.kts` reads `android/key.properties`:

```properties
storeFile=upload-keystore.jks
storePassword=<password>
keyAlias=upload
keyPassword=<password>
```

The keystore itself sits at `android/app/upload-keystore.jks`. Both files are
git-ignored (see `.gitignore`), and both are **not** recoverable from the
repository — back them up somewhere safe outside this project. Losing the
keystore means you can no longer publish an update that upgrades over
installed copies of the app.

If `key.properties` is missing, `packageRelease` fails on purpose rather than
falling back to the debug keystore (whose password is publicly known, letting
anyone re-sign an APK that upgrades over a shipped install).

To generate a new keystore:

```powershell
keytool -genkeypair -v -keystore android/app/upload-keystore.jks `
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload `
  -storepass <password> -keypass <password> `
  -dname "CN=Dawai,O=Dawai,L=Cairo,ST=Cairo,C=EG"
```

> **Note for existing installs:** APKs already shipped were signed with the
> debug keystore. Android rejects a signature change, so users on those
> builds must uninstall and reinstall once. From the next release onward
> updates are applied normally.

### Build troubleshooting

**`Gradle build daemon disappeared unexpectedly`** — the single-use daemon was
killed mid-build (nothing is logged: no OOM, no stack trace). Commitment and
pagefile are fine when this happens, so it is an external kill rather than
memory pressure. Re-running the build has always recovered it; the `app.so`
from the attempt that died is still valid and gets reused.

Note that `GRADLE_USER_HOME/gradle.properties` (`%USERPROFILE%\.gradle` and the
one set by `GRADLE_USER_HOME`) overrides this project's `gradle.properties` on
`org.gradle.jvmargs`, `org.gradle.daemon` and `org.gradle.caching`. On a machine
where those global files set `daemon=false`, every build starts a throwaway
daemon and stops it afterwards — which is where the flakiness above comes from.

**`e: Failed connecting to the daemon in 4 retries`** (`KotlinCompilerRunnerUtils`)
— the Kotlin compiler daemon could not be reached. It is *not* fatal: Gradle
falls back to in-process compilation and the build completes. `MainActivity.kt`
is the only Kotlin in the project, so the fallback costs nothing. If the retries
and the stack trace are unwanted, add to `android/gradle.properties`:

```properties
kotlin.compiler.execution.strategy=in-process
```

## Shipping a version

`release.ps1` (repo root) drives the whole flow: bump `pubspec.yaml`, build
the release APK, tag, publish the GitHub release, rewrite `version.json` and
verify propagation. It refuses to run without a valid release keystore.

```powershell
.\release.ps1 -DryRun     # preview, changes nothing
.\release.ps1             # interactive release
```

The app checks `version.json` on launch and prompts the user to update.

## Fonts

Tajawal ships inside the APK under `assets/fonts/`, one file per weight
(`Tajawal-Regular.ttf`, `-Medium`, `-Bold`, `-ExtraBold`, `-Black`, plus the
two light weights). `pubspec.yaml` declares them as plain assets — not under
`fonts:` — because `google_fonts` resolves a face by looking for an asset path
that ends with `<Family>-<Variant>.ttf`.

Runtime fetching from `fonts.gstatic.com` is left enabled as a safety net, but
with every weight bundled it never fires: the Arabic UI no longer flashes a
fallback font on first launch and renders correctly offline.
