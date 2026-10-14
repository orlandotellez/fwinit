import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fwiflu/core/providers/core_providers.dart';
import 'package:fwiflu/core/utils/app_logger.dart';

/// Persisted theme mode resolved before the first frame.
///
/// `bootstrap` overrides it with the stored value, so the app never flashes the
/// wrong brightness while storage resolves. It defaults to [ThemeMode.system],
/// which keeps widget tests free of extra provider overrides.
final initialThemeModeProvider = Provider<ThemeMode>((ref) => ThemeMode.system);

/// Holds the user's theme choice and persists it.
///
/// The mode is applied to the UI immediately and written to the key/value
/// store afterwards; a storage failure is logged and never surfaced
/// as an exception, because the in-memory choice is already in effect.
class ThemeModeController extends Notifier<ThemeMode> {
  /// Storage key holding `'system'`, `'light'` or `'dark'`.
  static const String storageKey = 'fwiflu.theme_mode';

  @override
  ThemeMode build() => ref.watch(initialThemeModeProvider);

  /// Decodes a persisted [storageKey] value.
  ///
  /// Anything that is not one of the three known names (including `null` and
  /// corrupt input) falls back to [ThemeMode.system].
  static ThemeMode resolve(String? raw) => switch (raw) {
    'light' => ThemeMode.light,
    'dark' => ThemeMode.dark,
    _ => ThemeMode.system,
  };

  /// Applies [mode] and persists it.
  Future<void> set(ThemeMode mode) async {
    if (state == mode) return;
    state = mode;
    try {
      await ref.read(keyValueStoreProvider).setString(storageKey, mode.name);
    } on Object catch (error, stackTrace) {
      AppLogger.instance.e(
        'ThemeModeController: could not persist ${mode.name}',
        error: error,
        stackTrace: stackTrace,
      );
    }
  }
}

/// The active [ThemeMode]. Watched by the root [MaterialApp].
final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(
  ThemeModeController.new,
);
