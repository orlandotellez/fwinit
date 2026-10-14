import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

/// Application-wide logger.
///
/// Wraps the `logger` package with sensible defaults:
/// - Pretty, colorized output in debug builds.
/// - Silenced in release builds (nothing is printed to production logs).
///
/// Usage:
/// ```dart
/// AppLogger.instance.i('Something happened');
/// AppLogger.instance.e('Failed', error: e, stackTrace: s);
/// ```
abstract final class AppLogger {
  static final Logger instance = Logger(
    filter: _AppLogFilter(),
    printer: PrettyPrinter(methodCount: 0, lineLength: 100),
  );
}

/// Only logs in debug/profile builds. Release builds stay silent.
class _AppLogFilter extends LogFilter {
  @override
  bool shouldLog(LogEvent event) => !kReleaseMode;
}
