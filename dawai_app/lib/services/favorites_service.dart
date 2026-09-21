import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class FavoritesService {
  static const _key = 'dawai_favorites';
  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<List<String>> getFavorites() async {
    final prefs = await _prefs;
    final json = prefs.getString(_key);
    if (json == null) return [];
    final List<dynamic> list = jsonDecode(json);
    return list.cast<String>();
  }

  Future<void> saveFavorites(List<String> productIds) async {
    final prefs = await _prefs;
    await prefs.setString(_key, jsonEncode(productIds));
  }

  Future<bool> isFavorite(String productId) async {
    final favorites = await getFavorites();
    return favorites.contains(productId);
  }

  Future<void> toggleFavorite(String productId) async {
    final favorites = await getFavorites();
    if (favorites.contains(productId)) {
      favorites.remove(productId);
    } else {
      favorites.add(productId);
    }
    await saveFavorites(favorites);
  }
}
