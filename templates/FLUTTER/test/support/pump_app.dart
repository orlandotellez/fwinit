import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/theme/app_theme.dart';
import 'package:fwiflu/l10n/l10n.dart';

/// Pumps [widget] wrapped in the minimum shell a screen needs: a
/// [ProviderScope] (with optional [overrides]) and a localized [MaterialApp]
/// carrying the real app theme, so widget tests exercise the actual token
/// palette instead of Material's defaults.
///
/// Keeps individual widget tests focused on behavior instead of boilerplate.
extension PumpApp on WidgetTester {
  Future<void> pumpApp(Widget widget, {List<Override> overrides = const []}) {
    return pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: MaterialApp(
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: widget,
        ),
      ),
    );
  }
}
