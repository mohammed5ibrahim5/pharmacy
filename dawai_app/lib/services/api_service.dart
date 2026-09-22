import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/pharmacy.dart';
import '../models/product.dart';
import '../models/category.dart';
import '../models/order.dart';
import '../models/customer.dart';

class ApiService {
  final SupabaseClient _client = Supabase.instance.client;

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
    );
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  // ──── Settings ────
  Future<SiteSettings?> getSettings() async {
    final data = await _client
        .from('site_settings')
        .select('*')
        .maybeSingle();
    if (data == null) return null;
    return SiteSettings.fromJson(data);
  }

  // ──── Categories ────
  Future<List<Category>> getCategories() async {
    final data = await _client
        .from('categories')
        .select('*')
        .order('sort_order', ascending: true);
    return (data as List).map((e) => Category.fromJson(e)).toList();
  }

  // ──── Pharmacies ────
  Future<List<Pharmacy>> getPharmacies({String? search}) async {
    dynamic query = _client
        .from('pharmacies')
        .select('*')
        .order('rating', ascending: false);

    if (search != null && search.isNotEmpty) {
      final q = search.toLowerCase();
      query = query.or('name.ilike.%$q%,area.ilike.%$q%,address.ilike.%$q%');
    }

    final data = await query;
    return (data as List).map((e) => Pharmacy.fromJson(e)).toList();
  }

  Future<Pharmacy?> getPharmacy(String id) async {
    final data = await _client
        .from('pharmacies')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (data == null) return null;
    return Pharmacy.fromJson(data);
  }

  // ──── Products ────
  static const _productSelect = '*, pharmacy:pharmacies(id,name,logo_url,delivery_fee,delivery_available), category:categories(id,name,slug,icon)';

  Future<List<Product>> getProducts({String? pharmacyId, String? categoryId, String? search}) async {
    dynamic query = _client
        .from('products')
        .select(_productSelect)
        .eq('is_available', true)
        .order('name');

    if (pharmacyId != null) query = query.eq('pharmacy_id', pharmacyId);
    if (categoryId != null) query = query.eq('category_id', categoryId);
    if (search != null && search.isNotEmpty) {
      final q = search.toLowerCase();
      query = query.or('name.ilike.%$q%,name_en.ilike.%$q%,active_ingredient.ilike.%$q%');
    }

    final data = await query.limit(200);
    return (data as List).map((e) => Product.fromJson(e)).toList();
  }

  Future<Product?> getProduct(String id) async {
    final data = await _client
        .from('products')
        .select(_productSelect)
        .eq('id', id)
        .maybeSingle();
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
        .maybeSingle();

    if (customerRes == null) return [];

    final data = await _client
        .from('order_groups')
        .select('*, orders(*, product:products(id,name,image_url,unit), pharmacy:pharmacies(id,name,logo_url))')
        .eq('customer_id', customerRes['id'])
        .order('created_at', ascending: false)
        .limit(50);

    return (data as List).map((e) => OrderGroup.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> placeOrder({
    required List<Map<String, dynamic>> items,
    String? address,
    String? note,
    String? paymentMethod,
    String? paymentNumber,
  }) async {
    final response = await _client.rpc('place_order', params: {
      'p_items': items,
      'p_address': address,
      'p_note': note,
      'p_payment_method': paymentMethod,
      'p_payment_number': paymentNumber,
    });
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
        .limit(50);

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
        .maybeSingle();
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
          .eq('user_id', currentUser!.id);
    }
  }

  // ──── Notifications ────
  Future<int> getUnreadNotificationsCount() async {
    if (currentUser == null) return 0;
    final customerRes = await _client
        .from('customers')
        .select('id')
        .eq('user_id', currentUser!.id)
        .maybeSingle();
    if (customerRes == null) return 0;

    final data = await _client
        .from('notifications')
        .select('id')
        .eq('customer_id', customerRes['id'])
        .eq('read', false);
    return (data as List).length;
  }

  Future<void> resetPassword(String email) async {
    await _client.auth.resetPasswordForEmail(email);
  }
}
