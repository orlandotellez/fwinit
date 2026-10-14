import 'package:shared_preferences/shared_preferences.dart';

/// A thin, testable abstraction over non-sensitive local key/value storage.
///
/// The interface lets you swap the backing implementation (or mock it in
/// tests) without touching callers. The default implementation is backed by
/// `shared_preferences`.
abstract interface class KeyValueStore {
  Future<String?> getString(String key);
  Future<bool> setString(String key, String value);
  Future<bool?> getBool(String key);
  Future<bool> setBool(String key, {required bool value});
  Future<bool> remove(String key);
  Future<bool> clear();
}

class SharedPreferencesStore implements KeyValueStore {
  SharedPreferencesStore(this._prefs);

  final SharedPreferences _prefs;

  /// Convenience factory that resolves the [SharedPreferences] instance.
  static Future<SharedPreferencesStore> create() async {
    final prefs = await SharedPreferences.getInstance();
    return SharedPreferencesStore(prefs);
  }

  @override
  Future<String?> getString(String key) async => _prefs.getString(key);

  @override
  Future<bool> setString(String key, String value) =>
      _prefs.setString(key, value);

  @override
  Future<bool?> getBool(String key) async => _prefs.getBool(key);

  @override
  Future<bool> setBool(String key, {required bool value}) =>
      _prefs.setBool(key, value);

  @override
  Future<bool> remove(String key) => _prefs.remove(key);

  @override
  Future<bool> clear() => _prefs.clear();
}
