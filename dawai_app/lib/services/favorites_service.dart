import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FavoritesService {
  static const _key = 'dawai_favorites';
  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<List<String>> getFavorites() async {
    final prefs = await _prefs;
    final json = prefs.getString(_key);
    if (json == null) return [];
    try {
      final List<dynamic> list = jsonDecode(json);
      return list.cast<String>();
    } catch (_) {
      // Corrupt or legacy data used to throw a FormatException/TypeError out
      // of AppState.loadFavorites(), which is a `void async` method — so the
      // failure was unhandled, `_favoriteIds` never loaded and no rebuild
      // ever fired. Match CartService and start from an empty list instead.
      debugPrint('discarding corrupt favorites payload');
      return [];
    }
  }

  Future<void> saveFavorites(List<String> productIds) async {
    final prefs = await _prefs;
    await prefs.setString(_key, jsonEncode(productIds));
  }
}
