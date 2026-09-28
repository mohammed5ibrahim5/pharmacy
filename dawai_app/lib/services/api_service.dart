import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/pharmacy.dart';
import '../models/product.dart';
import '../models/category.dart';
import '../models/order.dart';
import '../models/customer.dart';

/// One window of a paged listing, plus how many rows match the filters.
class ProductPage {
  const ProductPage({required this.products, required this.total});

  final List<Product> products;

  /// Total across *all* pages. PostgREST derives it from the filters alone —
  /// `limit`/`offset` do not affect it — so it costs nothing on top of the
  /// page itself.
  final int total;
}

class ApiService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Bounds every request so a dead connection ends in a retry prompt instead
  /// of an indefinite spinner. Supabase's HTTP stack has no default timeout of
  /// its own, so an unreachable host used to leave screens loading forever.
  /// [friendlyError] already maps `TimeoutException` to Arabic copy.
  static const netTimeout = Duration(seconds: 20);

  SupabaseClient get client => _client;

  // ──── Auth ────
  User? get currentUser => _client.auth.currentUser;
  Session? get currentSession => _client.auth.currentSession;

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    return _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName, 'phone': phone},
    ).timeout(netTimeout);
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return _client.auth
        .signInWithPassword(email: email, password: password)
        .timeout(netTimeout);
  }

  Future<void> signOut() async {
    await _client.auth.signOut().timeout(netTimeout);
  }

  // ──── Settings ────
  Future<SiteSettings?> getSettings() async {
    final data = await _client
        .from('site_settings')
        .select('*')
        .maybeSingle()
        .timeout(netTimeout);
    if (data == null) return null;
    return SiteSettings.fromJson(data);
  }

  // ──── Categories ────
  Future<List<Category>> getCategories() async {
    final data = await _client
        .from('categories')
        .select('*')
        .order('sort_order', ascending: true)
        .timeout(netTimeout);
    return (data as List).map((e) => Category.fromJson(e)).toList();
  }

  // ──── Pharmacies ────
  /// The search filter is applied *before* `.order()`, never after.
  ///
  /// `order()` moves the builder onto `PostgrestTransformBuilder`, which
  /// exposes only `.limit()`/`.range()`/`.maybeSingle()` — no `.eq()`/`.or()`.
  /// The query used to be declared `dynamic`, so calling a filter after
  /// ordering compiled fine and then threw `NoSuchMethodError` at runtime,
  /// meaning search (and every product filter) had silently never worked.
  /// The static type below turns that mistake into a compile error.
  Future<List<Pharmacy>> getPharmacies({String? search}) async {
    PostgrestFilterBuilder<PostgrestList> query =
        _client.from('pharmacies').select('*');

    if (search != null && search.isNotEmpty) {
      final q = search.toLowerCase();
      query = query.or('name.ilike.%$q%,area.ilike.%$q%,address.ilike.%$q%');
    }

    final data =
        await query.order('rating', ascending: false).timeout(netTimeout);
    return data.map((e) => Pharmacy.fromJson(e)).toList();
  }

  Future<Pharmacy?> getPharmacy(String id) async {
    final data = await _client
        .from('pharmacies')
        .select('*')
        .eq('id', id)
        .maybeSingle()
        .timeout(netTimeout);
    if (data == null) return null;
    return Pharmacy.fromJson(data);
  }

  // ──── Products ────
  static const _productSelect = '*, pharmacy:pharmacies(id,name,logo_url,delivery_fee,delivery_available), category:categories(id,name,slug,icon)';

  /// Rows per page of the product listings. The screens that page render a
  /// two-column grid, so a page is about a dozen rows — comfortably deeper
  /// than one viewport, which is what keeps the "fetch the next page" trigger
  /// from firing again the moment it finishes.
  static const int productPageSize = 24;

  /// Builds the filter half of a product query. Kept separate so
  /// [getProducts] and [getProductPage] cannot drift apart — see
  /// [getPharmacies] for why every `.eq()`/`.or()` has to happen while the
  /// builder is still a `PostgrestFilterBuilder` and before any `.order()`.
  PostgrestFilterBuilder<PostgrestList> _productQuery({
    String? pharmacyId,
    String? categoryId,
    String? search,
    bool otcOnly = false,
  }) {
    PostgrestFilterBuilder<PostgrestList> query = _client
        .from('products')
        .select(_productSelect)
        .eq('is_available', true);

    if (pharmacyId != null) query = query.eq('pharmacy_id', pharmacyId);
    if (categoryId != null) query = query.eq('category_id', categoryId);
    if (otcOnly) query = query.eq('requires_prescription', false);
    if (search != null && search.isNotEmpty) {
      final q = search.toLowerCase();
      query = query.or('name.ilike.%$q%,name_en.ilike.%$q%,active_ingredient.ilike.%$q%');
    }
    return query;
  }

  /// Sorts and slices a query into a page.
  ///
  /// The `id` tie-break is not cosmetic: `name` repeats constantly in a
  /// pharmacy catalogue, and a sort key that does not totally order the rows
  /// lets a record equal to a page's last row fall between two pages — or
  /// show up twice — no matter how carefully the caller tracks its offset.
  PostgrestTransformBuilder<PostgrestList> _paged(
    PostgrestFilterBuilder<PostgrestList> query, {
    required int limit,
    required int offset,
  }) {
    return query
        .order('name')
        .order('id')
        .range(offset, offset + limit - 1);
  }

  /// One page of products and the total number matching the same filters.
  ///
  /// Screens used to pull the whole result set (capped, silently, at 200
  /// rows) and slice it themselves; a catalogue past that cap simply stopped
  /// returning rows with nothing on screen to say so.
  Future<ProductPage> getProductPage({
    String? pharmacyId,
    String? categoryId,
    String? search,
    bool otcOnly = false,
    int limit = productPageSize,
    int offset = 0,
  }) async {
    final res = await _paged(
      _productQuery(
        pharmacyId: pharmacyId,
        categoryId: categoryId,
        search: search,
        otcOnly: otcOnly,
      ),
      limit: limit,
      offset: offset,
    ).count(CountOption.exact).timeout(netTimeout);

    return ProductPage(
      products: res.data.map(Product.fromJson).toList(),
      total: res.count,
    );
  }

  /// Products without the total, for callers that only want a single window.
  ///
  /// [limit] defaults to a deliberately generous 200 rather than
  /// [productPageSize]: a call site that has not been taught to page should
  /// lose rows slowly, not at 24. Paging callers pass [productPageSize] and a
  /// rising [offset].
  Future<List<Product>> getProducts({
    String? pharmacyId,
    String? categoryId,
    String? search,
    bool otcOnly = false,
    int limit = 200,
    int offset = 0,
  }) async {
    final data = await _paged(
      _productQuery(
        pharmacyId: pharmacyId,
        categoryId: categoryId,
        search: search,
        otcOnly: otcOnly,
      ),
      limit: limit,
      offset: offset,
    ).timeout(netTimeout);
    return data.map(Product.fromJson).toList();
  }

  /// Per-category product counts for the home screen.
  ///
  /// These used to be derived from the same `getProducts()` list the home
  /// screen renders, so a catalog larger than that query's cap produced
  /// quietly wrong "N منتج" badges — while the app downloaded up to 200
  /// fully-joined product rows to show eight of them. Selecting a single
  /// column is a couple of KB instead.
  ///
  /// The 1000-row cap keeps this bounded rather than table-sized; past that
  /// the badges undercount, which is a display detail and not worth an
  /// aggregate endpoint of its own.
  Future<Map<String, int>> getCategoryProductCounts() async {
    final data = await _client
        .from('products')
        .select('category_id')
        .eq('is_available', true)
        .limit(1000)
        .timeout(netTimeout);

    final counts = <String, int>{};
    for (final row in data) {
      final categoryId = row['category_id'];
      if (categoryId is! String) continue;
      counts[categoryId] = (counts[categoryId] ?? 0) + 1;
    }
    return counts;
  }

  Future<Product?> getProduct(String id) async {
    final data = await _client
        .from('products')
        .select(_productSelect)
        .eq('id', id)
        .maybeSingle()
        .timeout(netTimeout);
    if (data == null) return null;
    return Product.fromJson(data);
  }

  // ──── Orders ────
  Future<List<OrderGroup>> getMyOrders() async {
    if (currentUser == null) return [];

    final customerRes = await _client
        .from('customers')
        .select('id')
        .eq('user_id', currentUser!.id)
        .maybeSingle()
        .timeout(netTimeout);

    if (customerRes == null) return [];

    final data = await _client
        .from('order_groups')
        .select('*, orders(*, product:products(id,name,image_url,unit), pharmacy:pharmacies(id,name,logo_url))')
        .eq('customer_id', customerRes['id'])
        .order('created_at', ascending: false)
        .limit(50)
        .timeout(netTimeout);

    return (data as List).map((e) => OrderGroup.fromJson(e)).toList();
  }

  /// Fetches a single order group by id.
  ///
  /// The detail screen used to call [getMyOrders] (50 orders with nested
  /// joins) and filter client-side, which meant an order older than the 50
  /// most recent simply rendered as "not found".
  Future<OrderGroup?> getOrderById(String id) async {
    if (id.isEmpty) return null;
    final user = currentUser;
    if (user == null) return null;
    final customerRes = await _client
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .timeout(netTimeout);
    if (customerRes == null) return null;

    final data = await _client
        .from('order_groups')
        .select('*, orders(*, product:products(id,name,image_url,unit), pharmacy:pharmacies(id,name,logo_url))')
        .eq('id', id)
        .eq('customer_id', customerRes['id'])
        .maybeSingle()
        .timeout(netTimeout);
    if (data == null) return null;
    return OrderGroup.fromJson(data);
  }

  /// Calls the `place_order` Postgres function.
  ///
  /// The backend signature (project/supabase/migrations/
  /// 20260918000000_commission_system.sql) declares TEN parameters with no
  /// defaults, so every one of them must be supplied — PostgREST resolves the
  /// overload from the keys passed here and PostgreSQL rejects named calls
  /// that leave required arguments out.
  Future<Map<String, dynamic>> placeOrder({
    required List<Map<String, dynamic>> items,
    String? address,
    String? note,
    String? familyMemberId,
    String? paymentMethod,
    String? paymentNumber,
    String? paymentScreenshotUrl,
    int redeemChunks = 0,
    String? rxId,
    List<String>? rxProductIds,
  }) async {
    final response = await _client.rpc('place_order', params: {
      'p_items': items,
      'p_address': address,
      'p_note': note,
      'p_family_member_id': familyMemberId,
      'p_payment_method': paymentMethod,
      'p_payment_number': paymentNumber,
      'p_payment_screenshot_url': paymentScreenshotUrl,
      'p_redeem_chunks': redeemChunks,
      'p_rx_id': rxId,
      'p_rx_product_ids': rxProductIds,
    }).timeout(netTimeout);
    return response as Map<String, dynamic>;
  }

  // ──── Reviews ────
  Future<List<Review>> getPharmacyReviews(String pharmacyId) async {
    final data = await _client
        .from('reviews')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('is_visible', true)
        .order('created_at', ascending: false)
        .limit(50)
        .timeout(netTimeout);

    return (data as List)
        .map((e) => Review.fromJson(e))
        .toList();
  }

  // ──── Customer Profile ────
  Future<Customer?> getMyProfile() async {
    if (currentUser == null) return null;
    final data = await _client
        .from('customers')
        .select('*')
        .eq('user_id', currentUser!.id)
        .maybeSingle()
        .timeout(netTimeout);
    if (data == null) return null;
    return Customer.fromJson(data);
  }

  Future<void> updateProfile({String? fullName, String? phone}) async {
    if (currentUser == null) return;
    final updates = <String, dynamic>{};
    if (fullName != null) updates['full_name'] = fullName;
    if (phone != null) updates['phone'] = phone;
    if (updates.isNotEmpty) {
      await _client
          .from('customers')
          .update(updates)
          .eq('user_id', currentUser!.id)
          .timeout(netTimeout);
    }
  }

  // ──── Notifications ────
  Future<int> getUnreadNotificationsCount() async {
    if (currentUser == null) return 0;
    final customerRes = await _client
        .from('customers')
        .select('id')
        .eq('user_id', currentUser!.id)
        .maybeSingle()
        .timeout(netTimeout);
    if (customerRes == null) return 0;

    final data = await _client
        .from('notifications')
        .select('id')
        .eq('customer_id', customerRes['id'])
        .eq('read', false)
        .timeout(netTimeout);
    return (data as List).length;
  }

  Future<void> resetPassword(String email) async {
    await _client.auth.resetPasswordForEmail(email).timeout(netTimeout);
  }
}
