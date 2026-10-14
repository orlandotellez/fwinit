import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/providers/core_providers.dart';
import 'package:fwiflu/core/storage/key_value_store.dart';
import 'package:fwiflu/core/theme/theme_controller.dart';

/// In-memory [KeyValueStore] that records every write so tests can assert on
/// what was persisted.
class _RecordingStore implements KeyValueStore {
  _RecordingStore([Map<String, String>? seed]) : _values = {...?seed};

  final Map<String, String> _values;
  final List<(String, String)> writes = [];

  @override
  Future<String?> getString(String key) async => _values[key];

  @override
  Future<bool> setString(String key, String value) async {
    _values[key] = value;
    writes.add((key, value));
    return true;
  }

  @override
  Future<bool?> getBool(String key) async => null;

  @override
  Future<bool> setBool(String key, {required bool value}) async => true;

  @override
  Future<bool> remove(String key) async => _values.remove(key) != null;

  @override
  Future<bool> clear() async {
    _values.clear();
    return true;
  }
}

void main() {
  group('ThemeModeController', () {
    test('defaults to ThemeMode.system with no override', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(container.read(themeModeProvider), ThemeMode.system);
    });

    test('honours the initialThemeModeProvider override', () {
      final container = ProviderContainer(
        overrides: [initialThemeModeProvider.overrideWithValue(ThemeMode.dark)],
      );
      addTearDown(container.dispose);

      expect(container.read(themeModeProvider), ThemeMode.dark);
    });

    test('set applies the mode and persists its name', () async {
      final store = _RecordingStore();
      final container = ProviderContainer(
        overrides: [keyValueStoreProvider.overrideWithValue(store)],
      );
      addTearDown(container.dispose);

      await container.read(themeModeProvider.notifier).set(ThemeMode.dark);

      expect(container.read(themeModeProvider), ThemeMode.dark);
      expect(store.writes, [(ThemeModeController.storageKey, 'dark')]);
    });

    test('set is a no-op when the mode does not change', () async {
      final store = _RecordingStore();
      final container = ProviderContainer(
        overrides: [keyValueStoreProvider.overrideWithValue(store)],
      );
      addTearDown(container.dispose);

      await container.read(themeModeProvider.notifier).set(ThemeMode.system);

      expect(container.read(themeModeProvider), ThemeMode.system);
      expect(store.writes, isEmpty);
    });

    test('each of the three modes round-trips through storage', () async {
      final store = _RecordingStore();
      final container = ProviderContainer(
        overrides: [keyValueStoreProvider.overrideWithValue(store)],
      );
      addTearDown(container.dispose);

      final controller = container.read(themeModeProvider.notifier);
      await controller.set(ThemeMode.light);
      await controller.set(ThemeMode.dark);
      await controller.set(ThemeMode.system);

      expect(store.writes.map((write) => write.$2), [
        'light',
        'dark',
        'system',
      ]);
    });
  });

  group('ThemeModeController.resolve', () {
    test('decodes every persisted value', () {
      expect(ThemeModeController.resolve('light'), ThemeMode.light);
      expect(ThemeModeController.resolve('dark'), ThemeMode.dark);
      expect(ThemeModeController.resolve('system'), ThemeMode.system);
    });

    test('falls back to system for null and unknown input', () {
      expect(ThemeModeController.resolve(null), ThemeMode.system);
      expect(ThemeModeController.resolve('nope'), ThemeMode.system);
      expect(ThemeModeController.resolve(''), ThemeMode.system);
    });
  });
}
