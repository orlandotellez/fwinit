import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fwiflu/core/theme/app_colors.dart';
import 'package:fwiflu/core/theme/app_theme.dart';

/// WCAG 2.1 relative luminance for a [color].
double _luminance(Color color) {
  double channel(double value) => value <= 0.03928
      ? value / 12.92
      : math.pow((value + 0.055) / 1.055, 2.4).toDouble();

  return 0.2126 * channel(color.r) +
      0.7152 * channel(color.g) +
      0.0722 * channel(color.b);
}

/// WCAG 2.1 contrast ratio between two opaque colours.
double _contrast(Color a, Color b) {
  final first = _luminance(a);
  final second = _luminance(b);
  final lighter = math.max(first, second);
  final darker = math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/// The design system promises AA (4.5:1) for every pair it ships, so the
/// promise is verified instead of merely documented. A palette edit that
/// breaks readability fails here rather than in production.
void main() {
  const palettes = <String, AppPalette>{
    'light': AppPalette.light,
    'dark': AppPalette.dark,
  };

  const minimumAa = 4.5;

  group('AppPalette contrast', () {
    for (final entry in palettes.entries) {
      final name = entry.key;
      final palette = entry.value;

      test('$name: the accent is readable as text and as a surface', () {
        expect(
          _contrast(palette.accent, palette.bgBase),
          greaterThanOrEqualTo(minimumAa),
        );
        expect(
          _contrast(palette.accent, palette.bgElevated),
          greaterThanOrEqualTo(minimumAa),
        );
        expect(
          _contrast(palette.onAccent, palette.accent),
          greaterThanOrEqualTo(minimumAa),
        );
      });

      test('$name: text roles are readable on both surfaces', () {
        for (final surface in [palette.bgBase, palette.bgElevated]) {
          expect(
            _contrast(palette.textPrimary, surface),
            greaterThanOrEqualTo(minimumAa),
          );
          expect(
            _contrast(palette.textMuted, surface),
            greaterThanOrEqualTo(minimumAa),
          );
          // textFaint is decorative-only, but it still passes AA here: the
          // reference style guide does not, and a template should not ship a
          // label colour that is unreadable.
          expect(
            _contrast(palette.textFaint, surface),
            greaterThanOrEqualTo(minimumAa),
          );
        }
      });

      test('$name: semantic colours are readable on both surfaces', () {
        for (final semantic in [
          palette.success,
          palette.danger,
          palette.warning,
          palette.info,
        ]) {
          for (final surface in [palette.bgBase, palette.bgElevated]) {
            expect(
              _contrast(semantic, surface),
              greaterThanOrEqualTo(minimumAa),
            );
          }
        }
      });
    }
  });

  group('AppPalette invariants', () {
    test('borders are translucent hairlines, not solid fills', () {
      for (final palette in palettes.values) {
        expect(palette.border.a, lessThan(1));
        expect(palette.borderStrong.a, lessThan(1));
        expect(
          palette.borderStrong.a,
          greaterThan(palette.border.a),
          reason: 'the emphasised border must be stronger than the default one',
        );
      }
    });

    test('light and dark are genuinely different palettes', () {
      expect(AppPalette.light.bgBase, isNot(AppPalette.dark.bgBase));
      expect(AppPalette.light.accent, isNot(AppPalette.dark.accent));
      expect(AppPalette.light.onAccent, isNot(AppPalette.dark.onAccent));
    });

    test('copyWith and lerp keep the palette intact', () {
      const custom = AppPalette.light;
      final copied = custom.copyWith(accent: AppPalette.dark.accent);
      expect(copied.accent, AppPalette.dark.accent);
      expect(copied.bgBase, custom.bgBase);

      final halfway = custom.lerp(AppPalette.dark, 0.5);
      expect(halfway.bgBase, isNot(custom.bgBase));
      expect(halfway.bgBase, isNot(AppPalette.dark.bgBase));
    });
  });

  group('AppTheme wiring', () {
    testWidgets('both themes register the palette and agree with the scheme', (
      tester,
    ) async {
      for (final (label, theme) in [
        ('light', AppTheme.light()),
        ('dark', AppTheme.dark()),
      ]) {
        late AppPalette seen;
        await tester.pumpWidget(
          MaterialApp(
            theme: theme,
            home: Builder(
              builder: (context) {
                seen = context.palette;
                return const SizedBox.shrink();
              },
            ),
          ),
        );
        // MaterialApp animates between themes, so settle to the final palette
        // instead of asserting against an interpolated intermediate.
        await tester.pumpAndSettle();
        expect(
          seen,
          theme.extension<AppPalette>(),
          reason: '$label: the palette extension must be reachable',
        );
        expect(
          seen.accent,
          theme.colorScheme.primary,
          reason: '$label: the accent and the scheme primary must not drift',
        );
        expect(
          seen.bgBase,
          theme.scaffoldBackgroundColor,
          reason: '$label: the scaffold must sit on the base surface',
        );
      }
    });

    testWidgets('the app defines a light and a dark theme', (tester) async {
      expect(AppTheme.light().brightness, Brightness.light);
      expect(AppTheme.dark().brightness, Brightness.dark);
      expect(AppTheme.light().colorScheme.primary, AppPalette.light.accent);
      expect(AppTheme.dark().colorScheme.primary, AppPalette.dark.accent);
    });
  });
}
