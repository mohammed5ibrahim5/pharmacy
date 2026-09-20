import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../i18n/ar.dart';
import '../i18n/en.dart';

class LanguageProvider extends ChangeNotifier {
  static const String _prefKey = 'language_code';
  static const Map<String, String> _languageNames = {
    'ar': 'العربية',
    'en': 'English',
  };

  String _currentLanguageCode = 'ar';
  Locale _currentLocale = const Locale('ar', 'EG');

  static final Map<String, Map<String, String>> _translations = {
    'ar': arTranslations,
    'en': enTranslations,
  };

  LanguageProvider() {
    _loadSavedLanguage();
  }

  Locale get currentLocale => _currentLocale;
  String get currentLanguageCode => _currentLanguageCode;
  String get currentLanguageName => _languageNames[_currentLanguageCode] ?? 'العربية';
  bool get isArabic => _currentLanguageCode == 'ar';

  String t(String key) {
    return _translations[_currentLanguageCode]?[key] ?? key;
  }

  Future<void> _loadSavedLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedCode = prefs.getString(_prefKey);
      if (savedCode != null && _translations.containsKey(savedCode)) {
        _currentLanguageCode = savedCode;
        _currentLocale = savedCode == 'ar' ? const Locale('ar', 'EG') : const Locale('en', 'US');
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> toggleLanguage() async {
    _currentLanguageCode = _currentLanguageCode == 'ar' ? 'en' : 'ar';
    _currentLocale = _currentLanguageCode == 'ar' ? const Locale('ar', 'EG') : const Locale('en', 'US');
    notifyListeners();
    await _saveLanguage();
  }

  Future<void> setLanguage(String code) async {
    if (!_translations.containsKey(code)) return;
    if (_currentLanguageCode == code) return;
    _currentLanguageCode = code;
    _currentLocale = code == 'ar' ? const Locale('ar', 'EG') : const Locale('en', 'US');
    notifyListeners();
    await _saveLanguage();
  }

  Future<void> _saveLanguage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefKey, _currentLanguageCode);
    } catch (_) {}
  }
}
