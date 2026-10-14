import 'package:flutter/material.dart';

/// The explicit type scale of the fwiflu design language.
///
/// The platform system font is used on purpose: no font assets, no
/// `google_fonts`, no network fetch at runtime. Hierarchy comes from size,
/// weight and tracking, never from a second family or from gradient fills.
///
/// Flutter's `letterSpacing` is an absolute logical-pixel value, so the design
/// tokens are expressed as `em x fontSize`.
abstract final class AppTypography {
  /// Builds the complete [TextTheme] for [scheme].
  static TextTheme textTheme(ColorScheme scheme) => TextTheme(
    displayLarge: TextStyle(
      fontSize: 44,
      fontWeight: FontWeight.w700,
      letterSpacing: -1.32,
      height: 1.15,
      color: scheme.onSurface,
    ),
    displayMedium: TextStyle(
      fontSize: 36,
      fontWeight: FontWeight.w700,
      letterSpacing: -1.08,
      height: 1.15,
      color: scheme.onSurface,
    ),
    displaySmall: TextStyle(
      fontSize: 30,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.60,
      height: 1.20,
      color: scheme.onSurface,
    ),
    headlineLarge: TextStyle(
      fontSize: 32,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.64,
      height: 1.20,
      color: scheme.onSurface,
    ),
    headlineMedium: TextStyle(
      fontSize: 26,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.52,
      height: 1.25,
      color: scheme.onSurface,
    ),
    headlineSmall: TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.22,
      height: 1.30,
      color: scheme.onSurface,
    ),
    titleLarge: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.20,
      height: 1.35,
      color: scheme.onSurface,
    ),
    titleMedium: TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
      height: 1.40,
      color: scheme.onSurface,
    ),
    titleSmall: TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      letterSpacing: 0,
      height: 1.40,
      color: scheme.onSurface,
    ),
    bodyLarge: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w400,
      letterSpacing: 0,
      height: 1.60,
      color: scheme.onSurface,
    ),
    bodyMedium: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      letterSpacing: 0,
      height: 1.60,
      color: scheme.onSurface,
    ),
    bodySmall: TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w400,
      letterSpacing: 0,
      height: 1.50,
      color: scheme.onSurfaceVariant,
    ),
    labelLarge: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.28,
      height: 1.40,
      color: scheme.onSurface,
    ),
    labelMedium: TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.20,
      height: 1.40,
      color: scheme.onSurfaceVariant,
    ),
    labelSmall: TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.20,
      height: 1.40,
      color: scheme.onSurfaceVariant,
    ),
  );

  /// The quiet uppercase section label: 12sp, w600, 0.12em tracking.
  ///
  /// Decorative metadata only. By design it is never used for body copy, for
  /// input values, or for anything the user must read to act.
  static TextStyle sectionLabel(Color color) => TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.44,
    height: 1.40,
    color: color,
  );
}
